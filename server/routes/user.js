import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all users (except requesting user)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('-supabaseId')
      .sort({ username: 1 });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-supabaseId');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    
    await user.save();
    
    res.status(200).json({
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;