import React, { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { downloadMediaFile } from '@/lib/download';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  if (!imageUrl) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMediaFile(imageUrl, `naijapins-photo-${Date.now()}.jpg`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
          title="Download Image"
        >
          {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Close Lightbox"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
        <img
          src={imageUrl}
          alt="Full Preview"
          className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
        />
      </div>
    </div>
  );
};
