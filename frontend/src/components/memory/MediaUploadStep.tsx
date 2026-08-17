import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Image as ImageIcon, Volume2, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

export interface MediaFileItem {
  file: File;
  previewUrl: string;
  type: 'image' | 'audio';
  caption?: string;
}

interface MediaUploadStepProps {
  initialMedia: MediaFileItem[];
  maxFiles?: number;
  onNext: (media: MediaFileItem[]) => void;
  onBack: () => void;
}

export const MediaUploadStep: React.FC<MediaUploadStepProps> = ({
  initialMedia,
  maxFiles = 3,
  onNext,
  onBack,
}) => {
  const [mediaItems, setMediaItems] = useState<MediaFileItem[]>(initialMedia);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setErrorMsg(null);

    const imageCount = mediaItems.filter((m) => m.type === 'image').length;
    if (imageCount + files.length > maxFiles) {
      setErrorMsg(`You can upload a maximum of ${maxFiles} photos per memory pin submission.`);
      return;
    }

    const newItems: MediaFileItem[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select image files (JPG, PNG, WebP).');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('Image size exceeds maximum 15 MB limit.');
        continue;
      }
      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: 'image',
      });
    }

    setMediaItems((prev) => [...prev, ...newItems]);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setErrorMsg(null);

    const audioCount = mediaItems.filter((m) => m.type === 'audio').length;
    if (audioCount >= 1) {
      setErrorMsg('Only 1 audio recording file can be attached per memory.');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setErrorMsg('Please select a valid audio file (MP3, WAV, M4A).');
      return;
    }

    setMediaItems((prev) => [
      ...prev,
      {
        file,
        previewUrl: URL.createObjectURL(file),
        type: 'audio',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const item = mediaItems[index];
    if (item && item.previewUrl && item.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // Ignore revoke errors
      }
    }
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-extrabold text-black">Step 3: Media Upload</h2>
        <p className="text-xs sm:text-sm text-charcoal-muted">
          Attach historical photos or voice audio recordings to bring your memory to life. (Max {maxFiles} photos)
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* Upload Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Photo Upload Card */}
        <label className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-emerald-50/40 transition-colors text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-black">Upload Photos</span>
          <span className="text-[11px] text-charcoal-muted">JPG, PNG, WebP up to {maxFiles} files</span>
        </label>

        {/* Audio Upload Card */}
        <label className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition-colors text-center">
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Volume2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-black">Upload Audio Recording</span>
          <span className="text-[11px] text-charcoal-muted">Oral history recording (MP3/WAV)</span>
        </label>
      </div>

      {/* Media Previews List */}
      {mediaItems.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-black uppercase tracking-wider">Attached Media Files ({mediaItems.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mediaItems.map((item, idx) => (
              <div key={idx} className="relative group border border-border rounded-xl overflow-hidden bg-gray-50 h-28">
                {item.type === 'image' ? (
                  <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-amber-700 bg-amber-50/60">
                    <Volume2 className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold truncate max-w-full px-1">{item.file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Navigation Buttons */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <Button variant="outline" size="md" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={() => onNext(mediaItems)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
};
