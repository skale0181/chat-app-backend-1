import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all chats for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    
    res.status(200).json(chats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new chat
router.post('/', authenticate, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [req.userId, participantId], $size: 2 }
    });
    
    if (existingChat) {
      return res.status(200).json(existingChat);
    }
    
    // Create new chat
    const chat = new Chat({
      participants: [req.userId, participantId],
      createdBy: req.userId,
      unreadCount: new Map([
        [req.userId.toString(), 0],
        [participantId.toString(), 0]
      ])
    });
    
    await chat.save();
    
    // Populate participant details
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username avatar isOnline lastSeen');
    
    res.status(201).json(populatedChat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('lastMessage');
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }
    
    res.status(200).json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark chat as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const chatId = req.params.id;
    
    // Find chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Check if user is participant
    if (!chat.participants.some(p => p.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }
    
    // Mark all messages as read
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.userId }, readBy: { $ne: req.userId } },
      { $addToSet: { readBy: req.userId } }
    );
    
    // Reset unread count for this user
    chat.unreadCount.set(req.userId.toString(), 0);
    await chat.save();
    
    res.status(200).json({ success: true, chatId });
  } catch (error) {
    console.error('Mark chat as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;