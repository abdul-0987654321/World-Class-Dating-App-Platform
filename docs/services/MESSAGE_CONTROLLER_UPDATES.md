# Message Controller Updates for Real-Time Integration

## Changes Required

### 1. Add Import at Top of File
Add this import after the existing imports:
```typescript
import { messageEventsService } from '../../domain/services/message-events.service';
```

### 2. Update sendMessage Method
After line 154 (after incrementing unread count), add:
```typescript
// Publish real-time event to receiver
await messageEventsService.publishNewMessage(createdMessage);
```

### 3. Update deleteMessage Method
After line 333 (after hard delete), add:
```typescript
// Get target user ID
const targetUserId = message.senderId === userId ? message.receiverId : message.senderId;

// Publish delete event if deleting for all
await messageEventsService.publishMessageDeleted(
  messageId,
  conversationId,
  userId,
  targetUserId
);
```

### 4. Add New Method: markMessageAsRead
Add this new method before updateMessageStatus:
```typescript
/**
 * PUT /api/messages/:messageId/read
 * Mark a specific message as read
 */
async markMessageAsRead(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required',
      });
    }

    const message = await messageRepository.findById(messageId, conversationId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Only receiver can mark as read
    if (message.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the receiver can mark message as read',
        });
    }

    // Update message status
    const updatedMessage = await messageRepository.update(messageId, conversationId, {
      status: MessageStatus.READ,
      readAt: new Date(),
    });

    // Publish read receipt event
    await messageEventsService.publishMessageRead(
      conversationId,
      [messageId],
      userId,
      [message.senderId]
    );

    logger.info(\`Message \${messageId} marked as read by \${userId}\`);

    return res.status(200).json({
      success: true,
      data: updatedMessage,
      message: 'Message marked as read',
    });
  } catch (error: any) {
    logger.error('Failed to mark message as read:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark message as read',
    });
  }
}
```

### 5. Update updateMessageStatus Method
After line 403 (after updating the message), add:
```typescript
// Publish status update event
if (status === MessageStatus.DELIVERED) {
  await messageEventsService.publishMessageDelivered(
    messageId,
    conversationId,
    userId,
    message.senderId
  );
} else if (status === MessageStatus.READ) {
  await messageEventsService.publishMessageRead(
    conversationId,
    [messageId],
    userId,
    [message.senderId]
  );
}
```
