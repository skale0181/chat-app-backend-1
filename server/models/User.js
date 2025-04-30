import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  avatar: {
    type: String,
    default: ''
  },
  supabaseId: {
    type: String,
    required: true,
    unique: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create User model
const User = mongoose.model('User', userSchema);

export default User;