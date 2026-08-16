"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  currentPhotos?: string[];
  disabled?: boolean;
  size?: 'normal' | 'small';  // Add size prop
}

export default function PhotoUpload({
  onPhotosChange,
  maxPhotos = 2,
  currentPhotos = [],
  disabled = false,
  size = 'normal'
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>(currentPhotos);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size configurations
  const sizeConfig = size === 'small'
    ? { boxWidth: 'w-16', boxHeight: 'h-16', iconSize: 'h-4 w-4', textSize: 'text-[10px]' }
    : { boxWidth: 'w-32', boxHeight: 'h-32', iconSize: 'h-6 w-6', textSize: 'text-xs' };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const file = files[0];
    if (!file) return;

    // Client-side validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a JPG or PNG file');
      return;
    }

    if (file.size > 1024 * 1024) {
      alert('File size must be less than 1MB');
      return;
    }

    // Upload to server
    const index = uploading !== null ? uploading : photos.length;
    setUploading(index);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('index', String(index));

      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const updatedPhotos = [...photos, result.url];
        setPhotos(updatedPhotos);
        onPhotosChange(updatedPhotos);
      } else {
        alert(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploading(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={photo} className="relative group">
            <div className={`${sizeConfig.boxWidth} ${sizeConfig.boxHeight} rounded-lg overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800`}>
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load image:', photo);
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l-4.5-2h3l-2-5h-2l2 5z"/%3E%3C/svg%3E';
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => removePhoto(index)}
              disabled={disabled}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {uploading !== null ? (
          <div className={`${sizeConfig.boxWidth} ${sizeConfig.boxHeight} rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center`}>
            <div className="bb-loading-sm"></div>
          </div>
        ) : photos.length < maxPhotos ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`${sizeConfig.boxWidth} ${sizeConfig.boxHeight} rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:border-[#168BB0] dark:hover:border-[#168BB0] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Upload className={`${sizeConfig.iconSize} text-zinc-400`} />
            <span className={`${sizeConfig.textSize} text-zinc-500`}>{size === 'small' ? 'Upload' : 'Upload Photo'}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileSelect}
        disabled={disabled || uploading !== null}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="text-xs text-zinc-500">
          {photos.length} / {maxPhotos} photos uploaded
        </div>
      )}
    </div>
  );
}
