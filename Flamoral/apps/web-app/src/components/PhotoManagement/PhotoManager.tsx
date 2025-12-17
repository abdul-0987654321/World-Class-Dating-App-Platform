import React, { useState, useRef, useCallback } from 'react';

interface Photo {
  id: string;
  url: string;
  isMain: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

interface PhotoManagerProps {
  photos: Photo[];
  maxPhotos?: number;
  onPhotosChange: (photos: Photo[]) => void;
  onUpload?: (file: File) => Promise<string>;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  photos,
  maxPhotos = 6,
  onPhotosChange,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    if (photos.length >= maxPhotos) {
      alert(`You can only upload up to ${maxPhotos} photos`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      let photoUrl: string;
      if (onUpload) {
        photoUrl = await onUpload(file);
      } else {
        // Fallback: create local URL
        photoUrl = URL.createObjectURL(file);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add cache-busting timestamp to ensure fresh image load
      const cacheBustedUrl = photoUrl.includes('?')
        ? `${photoUrl}&t=${Date.now()}`
        : `${photoUrl}?t=${Date.now()}`;

      const newPhoto: Photo = {
        id: `photo_${Date.now()}`,
        url: cacheBustedUrl,
        isMain: photos.length === 0,
        moderationStatus: 'pending',
        uploadedAt: new Date().toISOString(),
      };

      // Update photos array
      const updatedPhotos = [...photos, newPhoto];
      onPhotosChange(updatedPhotos);

      // Force refresh of images by clearing browser cache for this component
      setTimeout(() => {
        // Trigger a re-render with updated photos
        onPhotosChange([...updatedPhotos]);
      }, 100);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);

    // If removed photo was main, make first photo main
    if (photos.find(p => p.id === photoId)?.isMain && updatedPhotos.length > 0) {
      updatedPhotos[0].isMain = true;
    }

    onPhotosChange(updatedPhotos);
  };

  const handleSetMain = (photoId: string) => {
    const updatedPhotos = photos.map(p => ({
      ...p,
      isMain: p.id === photoId,
    }));
    onPhotosChange(updatedPhotos);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, draggedPhoto);

    onPhotosChange(newPhotos);
    setDraggedIndex(null);
  };

  const getModerationBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Reviewing
          </span>
        );
      case 'approved':
        return (
          <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Photos</h3>
        <p className="text-sm text-gray-500">
          {photos.length}/{maxPhotos} photos
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <div
            key={`${photo.id}-${photo.url}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={`aspect-[3/4] rounded-xl border-2 relative overflow-hidden bg-gray-50 cursor-move transition ${
              draggedIndex === index ? 'opacity-50 border-pink-500' : 'border-transparent'
            }`}
          >
            <img
              key={photo.url}
              src={photo.url}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="eager"
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              {!photo.isMain && (
                <button
                  onClick={() => handleSetMain(photo.id)}
                  className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                >
                  Set as Main
                </button>
              )}
              <button
                onClick={() => handleRemove(photo.id)}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
              >
                Remove
              </button>
            </div>

            {/* Main Badge */}
            {photo.isMain && (
              <span className="absolute top-2 left-2 px-2 py-1 bg-pink-500 text-white text-xs rounded-full font-medium">
                Main Photo
              </span>
            )}

            {/* Moderation Badge */}
            {getModerationBadge(photo.moderationStatus)}

            {/* Drag Handle */}
            <div className="absolute bottom-2 left-2 p-1 bg-black/50 rounded text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
        ))}

        {/* Upload Button */}
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-pink-300 transition flex flex-col items-center justify-center text-gray-400 hover:text-pink-500 bg-gray-50 hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <svg className="w-8 h-8 mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-medium">{uploadProgress}%</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">Add Photo</span>
              </>
            )}
          </button>
        )}

        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, maxPhotos - photos.length - 1) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
          />
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Photo Tips</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use clear, high-quality photos that show your face</li>
          <li>• Drag photos to reorder them</li>
          <li>• Your main photo is shown first on your profile</li>
          <li>• Photos are reviewed for safety and quality</li>
          <li>• Avoid group photos or heavily filtered images</li>
        </ul>
      </div>
    </div>
  );
};

export default PhotoManager;
