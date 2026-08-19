import React from 'react';

interface MessageReactionsBarProps {
  onReact: (emoji: string) => void;
  onClose: () => void;
  isCurrentUser: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageReactionsBar: React.FC<MessageReactionsBarProps> = ({
  onReact,
  onClose,
  isCurrentUser,
}) => {
  return (
    <div
      className={`absolute -top-10 ${
        isCurrentUser ? 'right-0' : 'left-0'
      } z-30 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-lg animate-scale-up select-none`}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className="w-7 h-7 rounded-full hover:bg-gray-100 hover:scale-125 flex items-center justify-center text-sm transition-all active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
