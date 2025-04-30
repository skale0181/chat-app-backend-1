import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get messages for a chat
router.get('/chat/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, before } = req.query;
    
    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }
    
    // Build query
    const query = { chat: chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('sender', 'username avatar');
    
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post('/', authenticate, async (req, res) => {
  try {
    const { chatId, content, contentType = 'text', fileUrl, fileName, fileSize } = req.body;
    
    if (!chatId || !content) {
      return res.status(400).json({ error: 'Chat ID and content are required' });
    }
    
    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chat.participants.some(p => p.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }
    
    // Create new message
    const message = new Message({
      chat: chatId,
      sender: req.userId,
      content,
      contentType,
      fileUrl,
      fileName,
      fileSize,
      readBy: [req.userId] // Mark as read by sender
    });
    
    await message.save();
    
    // Update chat with last message and increment unread counter for recipient
    const recipientId = chat.participants.find(
      p => p.toString() !== req.userId
    ).toString();
    
    chat.lastMessage = message._id;
    chat.unreadCount.set(
      recipientId,
      (chat.unreadCount.get(recipientId) || 0) + 1
    );
    await chat.save();
    
    // Populate message details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark message as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    // Find message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user is in the chat
    const chat = await Chat.findById(message.chat);
    if (!chat.participants.some(p => p.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this message' });
    }
    
    // Don't mark your own messages as read
    if (message.sender.toString() === req.userId) {
      return res.status(400).json({ error: 'Cannot mark your own message as read' });
    }
    
    // Add user to readBy if not already there
    if (!message.readBy.includes(req.userId)) {
      message.readBy.push(req.userId);
      await message.save();
    }
    
    res.status(200).json({ success: true, messageId });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;