import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { checkRateLimit, RateLimitPresets, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_PHOTOS = 2;

// Magic byte signatures for image files
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF], // JPEG files start with FF D8 FF
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG files start with 89 50 4E 47 0D 0A 1A 0A
};

// Helper function to validate file type using magic bytes
const validateFileMagicBytes = (buffer: Buffer): 'jpeg' | 'png' | null => {
  // Check JPEG
  if (buffer.length >= 3) {
    const isJpeg = MAGIC_BYTES.jpeg.every((byte, index) => buffer[index] === byte);
    if (isJpeg) return 'jpeg';
  }

  // Check PNG
  if (buffer.length >= 8) {
    const isPng = MAGIC_BYTES.png.every((byte, index) => buffer[index] === byte);
    if (isPng) return 'png';
  }

  return null;
};

// Helper functions
const generateSafeFileName = (originalName: string, userId: string, index: string): string => {
  const fileExt = originalName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  return `${userId}_${timestamp}_${index}.${fileExt}`;
};

export async function POST(request: Request) {
  try {
    console.log("📤 [PHOTO UPLOAD] Starting photo upload...");

    // Check rate limit first (before auth to prevent DoS on auth check)
    const headers = request.headers;
    const clientIp = getClientIp(headers);
    const rateLimitResult = checkRateLimit(`upload:${clientIp}`, RateLimitPresets.UPLOAD);

    if (!rateLimitResult.allowed) {
      console.warn("⚠️ [PHOTO UPLOAD] Rate limit exceeded for:", clientIp);
      return NextResponse.json(
        { error: rateLimitResult.error || 'Too many upload attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RateLimitPresets.UPLOAD.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const auth = await requireAuth();
    if (!auth.success) {
      console.error("❌ [PHOTO UPLOAD] Unauthorized");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log("👤 [PHOTO UPLOAD] User:", auth.user.id, auth.user.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const index = formData.get('index') as string;

    if (!file) {
      console.error("❌ [PHOTO UPLOAD] No file provided");
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    console.log("📸 [PHOTO UPLOAD] File details:", file.name, file.size, file.type);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error("❌ [PHOTO UPLOAD] Invalid file type:", file.type);
      return new Response(JSON.stringify({
        error: 'Invalid file type. Only JPG, JPEG, and PNG files are allowed.'
      }), { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error("❌ [PHOTO UPLOAD] File too large:", file.size);
      return new Response(JSON.stringify({
        error: `File size exceeds 1MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
      }), { status: 400 });
    }

    // Use admin client for uploads (like invoice upload)
    const supabaseAdmin = createAdminClient();

    // Generate safe filename
    const safeFileName = generateSafeFileName(file.name, auth.user.id, index);
    console.log("📤 [PHOTO UPLOAD] Generated filename:", safeFileName);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify file type using magic bytes (security check against file type spoofing)
    const actualFileType = validateFileMagicBytes(buffer);
    if (!actualFileType) {
      console.error("❌ [PHOTO UPLOAD] Invalid file magic bytes - file type spoofing detected");
      return new Response(JSON.stringify({
        error: 'Invalid file format. File content does not match a valid image type.'
      }), { status: 400 });
    }

    // Double-check that the claimed type matches the actual magic bytes
    if (actualFileType === 'jpeg' && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      console.error("❌ [PHOTO UPLOAD] Magic bytes indicate JPEG but claimed type is:", file.type);
      return new Response(JSON.stringify({
        error: 'File type mismatch. Declared type does not match actual file content.'
      }), { status: 400 });
    }
    if (actualFileType === 'png' && !file.type.includes('png')) {
      console.error("❌ [PHOTO UPLOAD] Magic bytes indicate PNG but claimed type is:", file.type);
      return new Response(JSON.stringify({
        error: 'File type mismatch. Declared type does not match actual file content.'
      }), { status: 400 });
    }

    // Upload to Supabase Storage 'comments' bucket
    console.log("📤 [PHOTO UPLOAD] Uploading to 'comments' bucket...");

    const bucketName = 'comments';
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(safeFileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("❌ [PHOTO UPLOAD] Supabase Storage error:", uploadError);
      console.error("❌ [PHOTO UPLOAD] Make sure bucket '" + bucketName + "' exists and is public");
      return new Response(JSON.stringify({
        error: 'Failed to upload file to storage. Please ensure the "comments" bucket exists in Supabase Storage and is set to public.',
        details: uploadError.message
      }), { status: 500 });
    }

    console.log("✅ [PHOTO UPLOAD] File uploaded successfully:", uploadData);

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    console.log("🔗 [PHOTO UPLOAD] Public URL generated:", publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uploadData.path
    }, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': RateLimitPresets.UPLOAD.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    });

  } catch (error: any) {
    console.error("❌ [PHOTO UPLOAD] Upload error:", error);
    return NextResponse.json({
      error: error.message || 'Failed to upload file'
    }, { status: 500 });
  }
}
