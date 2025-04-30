// Set of connected users and their Socket IDs
const connectedUsers = new Map(); // userId -> Set of socket IDs

export const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} with socket: ${socket.id}`);

    // Add user to connected users map
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);

    // Update online status
    updateUserStatus(io, socket.userId, true);

    // Join user's room for private messages
    socket.join(socket.userId);

    // Handle private message
    socket.on('private_message', (data) => {
      handlePrivateMessage(socket, data);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      handleTypingIndicator(socket, data);
    });

    // Handle message read status
    socket.on('message_read', (data) => {
      handleMessageRead(io, socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
};

// Helper functions for socket handlers
const handlePrivateMessage = (socket, data) => {
  const { recipientId, message } = data;

  // Emit to all of recipient's connected devices
  socket.to(recipientId).emit('private_message', {
    senderId: socket.userId,
    message,
    timestamp: new Date(),
  });

  // Also emit to all of sender's other connected devices
  const senderSockets = connectedUsers.get(socket.userId);
  if (senderSockets) {
    senderSockets.forEach((socketId) => {
      if (socketId !== socket.id) {
        socket.to(socketId).emit('private_message', {
          senderId: socket.userId,
          recipientId,
          message,
          timestamp: new Date(),
        });
      }
    });
  }
};

const handleTypingIndicator = (socket, data) => {
  const { recipientId, isTyping } = data;
  socket.to(recipientId).emit('typing', {
    senderId: socket.userId,
    isTyping,
  });
};

const handleMessageRead = (io, socket, data) => {
  const { chatId, messageIds, readBy } = data;

  // Emit to all users in this chat
  io.to(chatId).emit('message_read', {
    chatId,
    messageIds,
    readBy: socket.userId,
  });
};

const handleDisconnect = (io, socket) => {
  console.log(`User disconnected: ${socket.userId}`);

  const userSockets = connectedUsers.get(socket.userId);
  if (userSockets) {
    userSockets.delete(socket.id);

    if (userSockets.size === 0) {
      connectedUsers.delete(socket.userId);
      updateUserStatus(io, socket.userId, false);
    }
  }
};

const updateUserStatus = (io, userId, isOnline) => {
  io.emit('user_status', {
    userId,
    isOnline,
    lastSeen: isOnline ? null : new Date(),
  });
};

