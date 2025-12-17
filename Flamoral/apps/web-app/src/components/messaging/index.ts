/**
 * Messaging Components for Flamoral Dating Platform
 *
 * WeChat/WhatsApp-style messaging components including:
 * - Voice note recording and playback
 * - GIF picker with Giphy integration
 * - Virtual gift picker for monetization
 * - Media message display (images, videos, voice, GIFs)
 * - Reaction picker for message reactions
 * - Enhanced message input with all features
 */

// Voice Note Components
export { VoiceNoteRecorder, VoiceNotePlayer } from './VoiceNoteRecorder';

// GIF Picker
export { GifPicker } from './GifPicker';

// Reaction Picker
export { ReactionPicker, MessageReactions } from './ReactionPicker';
export type { Reaction } from './ReactionPicker';

// Virtual Gifts (WeChat-style monetization)
export { VirtualGiftPicker, GiftMessage } from './VirtualGiftPicker';
export type { VirtualGift } from './VirtualGiftPicker';

// Media Messages
export { MediaMessage, ImageLightbox } from './MediaMessage';
export type { MediaContent } from './MediaMessage';

// Enhanced Message Input (combines all features)
export { EnhancedMessageInput } from './EnhancedMessageInput';
