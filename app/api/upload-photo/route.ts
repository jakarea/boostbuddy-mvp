import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_PHOTOS = 2;

// Helper functions
const generateSafeFileName = (originalName: string, userId: string, index: string): string => {
  const fileExt = originalName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  return `${userId}_${timestamp}_${index}.${fileExt}`;
};

export async function POST(request: Request) {
  try {
    console.log("📤 [PHOTO UPLOAD] Starting photo upload...");

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

    // Upload to Supabase Storage 'comments' bucket
    console.log("📤 [PHOTO UPLOAD] Uploading to 'comments' bucket...");

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('comments')
      .upload(safeFileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("❌ [PHOTO UPLOAD] Supabase Storage error:", uploadError);
      return new Response(JSON.stringify({
        error: 'Failed to upload file to storage',
        details: uploadError.message
      }), { status: 500 });
    }

    console.log("✅ [PHOTO UPLOAD] File uploaded successfully:", uploadData);

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('comments')
      .getPublicUrl(uploadData.path);

    console.log("🔗 [PHOTO UPLOAD] Public URL generated:", publicUrl);

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      path: uploadData.path
    }), { status: 200 });

  } catch (error: any) {
    console.error("❌ [PHOTO UPLOAD] Upload error:", error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to upload file'
    }), { status: 500 });
  }
}
