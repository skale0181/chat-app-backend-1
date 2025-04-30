import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register/Login user with Supabase token
router.post('/verify', async (req, res) => {
  try {
    const { supabaseId, email, username } = req.body;
    
    if (!supabaseId || !email || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find or create user
    let user = await User.findOne({ supabaseId });
    
    if (!user) {
      // Create new user
      user = new User({
        supabaseId,
        email,
        username,
        isOnline: true,
        lastSeen: new Date()
      });
      await user.save();
    } else {
      // Update user status
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;