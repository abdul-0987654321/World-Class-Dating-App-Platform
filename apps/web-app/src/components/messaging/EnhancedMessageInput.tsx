/**
 * Enhanced Message Input Component
 * Full-featured message input with attachments, GIFs, voice notes, and gifts
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GifPicker } from './GifPicker';
import { VirtualGiftPicker, VirtualGift } from './VirtualGiftPicker';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';

// Re-export for convenience
export { VoiceNoteRecorder };

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, type?: string, metadata?: any) => void;
  onSendMedia: (file: File, type: 'image' | 'video') => void;
  onSendGif: (gifUrl: string, previewUrl: string) => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number) => void;
  onSendGift: (gift: VirtualGift) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  recipientName: string;
  disabled?: boolean;
}

type AttachmentType = 'media' | 'gif' | 'voice' | 'gift' | null;

export const EnhancedMessageInput: React.FC<EnhancedMessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  onSendGif,
  onSendVoiceNote,
  onSendGift,
  onTypingStart,
  onTypingStop,
  recipientName,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [activeAttachment, setActiveAttachment] = useState<AttachmentType>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ file: File; url: string } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  }, [onTypingStart, onTypingStop]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    if (previewMedia) {
      const type = previewMedia.file.type.startsWith('video/') ? 'video' : 'image';
      onSendMedia(previewMedia.file, type);
      setPreviewMedia(null);
      return;
    }

    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
    onTypingStop();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Only images and videos are allowed');
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB video, 10MB image
    if (file.size > maxSize) {
      alert(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewMedia({ file, url });
    setActiveAttachment(null);

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGifSelect = (gif: { url: string; previewUrl: string }) => {
    onSendGif(gif.url, gif.previewUrl);
    setActiveAttachment(null);
  };

  const handleVoiceSend = (audioBlob: Blob, duration: number) => {
    onSendVoiceNote(audioBlob, duration);
    setIsRecording(false);
    setActiveAttachment(null);
  };

  const handleGiftSelect = (gift: VirtualGift) => {
    onSendGift(gift);
    setActiveAttachment(null);
  };

  const toggleAttachment = (type: AttachmentType) => {
    setActiveAttachment(activeAttachment === type ? null : type);
  };

  // Common emojis for quick insert
  const quickEmojis = ['😊', '❤️', '😂', '🔥', '😍', '🥰', '😘', '✨'];

  return (
    <div className="relative bg-white border-t border-gray-200">
      {/* Media Preview */}
      {previewMedia && (
        <div className="p-3 border-b border-gray-100">
          <div className="relative inline-block">
            {previewMedia.file.type.startsWith('video/') ? (
              <video src={previewMedia.url} className="max-h-32 rounded-lg" controls />
            ) : (
              <img src={previewMedia.url} alt="Preview" className="max-h-32 rounded-lg" />
            )}
            <button
              onClick={() => {
                URL.revokeObjectURL(previewMedia.url);
                setPreviewMedia(null);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Attachment Pickers */}
      <div className="relative">
        {activeAttachment === 'gif' && (
          <GifPicker
            isOpen={true}
            onSelect={handleGifSelect}
            onClose={() => setActiveAttachment(null)}
          />
        )}
        {activeAttachment === 'gift' && (
          <VirtualGiftPicker
            isOpen={true}
            onSelect={handleGiftSelect}
            onClose={() => setActiveAttachment(null)}
            recipientName={recipientName}
          />
        )}
      </div>

      {/* Voice Recording UI */}
      {isRecording && (
        <div className="p-4 border-b border-gray-100">
          <VoiceNoteRecorder onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="flex items-center gap-2 p-2 border-b border-gray-100 bg-gray-50">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setMessage((prev) => prev + emoji);
                inputRef.current?.focus();
              }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(false)}
            className="ml-auto text-xs text-gray-500"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment Buttons */}
        <div className="flex items-center gap-1">
          {/* Image/Video */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors disabled:opacity-50"
            title="Send photo or video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* GIF */}
          <button
            onClick={() => toggleAttachment('gif')}
            disabled={disabled}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
              activeAttachment === 'gif'
                ? 'text-pink-500 bg-pink-50'
                : 'text-gray-500 hover:text-pink-500 hover:bg-pink-50'
            }`}
            title="Send GIF"
          >
            <span className="text-sm font-bold">GIF</span>
          </button>

          {/* Voice Note */}
          <button
            onClick={() => setIsRecording(true)}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors disabled:opacity-50"
            title="Record voice note"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          {/* Virtual Gift */}
          <button
            onClick={() => toggleAttachment('gift')}
            disabled={disabled}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
              activeAttachment === 'gift'
                ? 'text-pink-500 bg-pink-50'
                : 'text-gray-500 hover:text-pink-500 hover:bg-pink-50'
            }`}
            title="Send virtual gift"
          >
            <span className="text-xl">🎁</span>
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={disabled || isRecording}
            rows={1}
            className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 bottom-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !previewMedia)}
          className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EnhancedMessageInput;
