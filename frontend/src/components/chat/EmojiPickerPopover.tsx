import React from 'react';
import { Smile, X } from 'lucide-react';

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤩', '🥳', '😎'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '✌️', '🤞', '💪', '👊', '👋', '🤙', '👌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🇳🇬'],
  },
  {
    name: 'Heritage & Vibes',
    emojis: ['🇳🇬', '🌴', '☀️', '🎉', '🎊', '✨', '🔥', '💡', '🎵', '🎶', '🎤', '🏆', '⭐', '🍲', '🍗', '🍛', '👑', '🌍', '📍', '🗺️'],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onSelectEmoji,
  onClose,
}) => {
  return (
    <div className="absolute bottom-14 right-2 sm:right-6 z-40 bg-white border border-gray-200 rounded-3xl p-3 shadow-2xl w-72 sm:w-80 select-none animate-scale-up">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <Smile className="w-4 h-4 text-[#0B6B3A]" />
          <span>Emojis</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name} className="space-y-1.5">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {cat.name}
            </h5>
            <div className="grid grid-cols-7 gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-8 h-8 rounded-xl hover:bg-emerald-50 hover:scale-115 flex items-center justify-center text-lg transition-all active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
