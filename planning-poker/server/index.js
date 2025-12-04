import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { store } from './store.js';

const app = express();
const server = createServer(app);

// CORS configuration
const ALLOWED_ORIGINS = [
  'https://planningpoker101.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { hostName, roomName, avatarId } = req.body;
    
    if (!hostName) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    const { room, host } = await store.createRoom(hostName, roomName, avatarId);
    console.log(`Room created: ${room.id} by ${hostName}`);
    res.json({ room, host });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const roomData = await store.getRoom(req.params.roomId);
    
    if (!roomData) {
      console.log(`Room not found: ${req.params.roomId}`);
      return res.status(404).json({ error: 'Room not found', exists: false });
    }

    console.log(`Room found: ${req.params.roomId}`);
    res.json({ 
      room: roomData.room,
      exists: true 
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room', exists: false });
  }
});

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room
  socket.on('join_room', async ({ roomId, displayName, avatarId, userId }) => {
    try {
      console.log(`User ${displayName} attempting to join room ${roomId}`);
      
      // Check if reconnecting
      if (userId) {
        const result = await store.reconnectUser(roomId, userId);
        if (result) {
          socket.join(roomId.toUpperCase());
          store.mapSocketToUser(socket.id, roomId.toUpperCase(), userId);
          
          const roomState = await store.getRoomState(roomId);
          socket.emit('room_state', roomState);
          socket.to(roomId.toUpperCase()).emit('user_reconnected', { userId });
          return;
        }
      }

      // New user joining
      const result = await store.joinRoom(roomId, displayName, avatarId);
      if (!result) {
        console.log(`Room not found for join: ${roomId}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomId.toUpperCase());
      store.mapSocketToUser(socket.id, roomId.toUpperCase(), result.user.id);

      const roomState = await store.getRoomState(roomId);
      socket.emit('room_state', { ...roomState, userId: result.user.id });
      socket.to(roomId.toUpperCase()).emit('user_joined', { user: result.user });
      console.log(`User ${displayName} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Host joins their created room
  socket.on('host_join_room', async ({ roomId, hostId }) => {
    try {
      console.log(`Host ${hostId} joining room ${roomId}`);
      socket.join(roomId.toUpperCase());
      store.mapSocketToUser(socket.id, roomId.toUpperCase(), hostId);
      
      const roomState = await store.getRoomState(roomId);
      if (roomState) {
        socket.emit('room_state', { ...roomState, userId: hostId });
      } else {
        socket.emit('error', { message: 'Room not found' });
      }
    } catch (error) {
      console.error('Error host joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Change avatar
  socket.on('change_avatar', async ({ roomId, avatarId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const user = await store.updateUser(roomId, socketUser.userId, { avatarId });
      if (user) {
        io.to(roomId.toUpperCase()).emit('user_updated', { user });
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
    }
  });

  // Update room settings (host only)
  socket.on('update_room_settings', async ({ roomId, settings }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const room = await store.updateRoomSettings(roomId, settings);
      if (room) {
        io.to(roomId.toUpperCase()).emit('room_settings_updated', { settings: room.settings });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  });

  // Add story (host only)
  socket.on('add_story', async ({ roomId, story }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const newStory = await store.addStory(roomId, story);
      if (newStory) {
        io.to(roomId.toUpperCase()).emit('story_added', { story: newStory });
      }
    } catch (error) {
      console.error('Error adding story:', error);
    }
  });

  // Set current story (host only)
  socket.on('set_current_story', async ({ roomId, storyId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const story = await store.setCurrentStory(roomId, storyId);
      if (story) {
        io.to(roomId.toUpperCase()).emit('current_story_changed', { story, storyId });
      }
    } catch (error) {
      console.error('Error setting current story:', error);
    }
  });

  // Start round (host only)
  socket.on('start_round', async ({ roomId, storyId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const round = await store.startRound(roomId, storyId);
      if (round) {
        io.to(roomId.toUpperCase()).emit('round_started', { round });
      }
    } catch (error) {
      console.error('Error starting round:', error);
    }
  });

  // Start timer (host only)
  socket.on('start_timer', async ({ roomId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const timerInfo = await store.startTimer(roomId);
      if (timerInfo) {
        io.to(roomId.toUpperCase()).emit('timer_started', timerInfo);

        // Set up auto-lock when timer ends
        setTimeout(async () => {
          const currentRoomData = await store.getRoom(roomId);
          if (currentRoomData && 
              currentRoomData.room.currentRound && 
              !currentRoomData.room.currentRound.revealed) {
            await store.lockRound(roomId);
            io.to(roomId.toUpperCase()).emit('round_locked', { 
              storyId: currentRoomData.room.currentRound.storyId 
            });
          }
        }, timerInfo.countdownSeconds * 1000);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  });

  // Stop timer (host only)
  socket.on('stop_timer', async ({ roomId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      if (await store.stopTimer(roomId)) {
        io.to(roomId.toUpperCase()).emit('timer_stopped', {});
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  });

  // Cast vote
  socket.on('cast_vote', async ({ roomId, storyId, value }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const result = await store.castVote(roomId, storyId, socketUser.userId, value);
      if (result) {
        const votingStatus = await store.getVotingStatus(roomId, storyId);
        io.to(roomId.toUpperCase()).emit('voting_status_updated', { votingStatus });
        socket.emit('vote_confirmed', { storyId, value });
      }
    } catch (error) {
      console.error('Error casting vote:', error);
    }
  });

  // Reveal votes (host only)
  socket.on('reveal_votes', async ({ roomId, storyId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const result = await store.revealVotes(roomId, storyId);
      if (result) {
        io.to(roomId.toUpperCase()).emit('votes_revealed', {
          storyId,
          votes: result.votes,
          summary: result.summary
        });
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
    }
  });

  // Select final estimate (host only)
  socket.on('select_final_estimate', async ({ roomId, storyId, value }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const story = await store.setFinalEstimate(roomId, storyId, value);
      if (story) {
        io.to(roomId.toUpperCase()).emit('final_estimate_selected', { story });
      }
    } catch (error) {
      console.error('Error selecting final estimate:', error);
    }
  });

  // End session (host only)
  socket.on('end_session', async ({ roomId }) => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (!socketUser) return;

      const roomData = await store.getRoom(roomId);
      if (!roomData || roomData.room.hostId !== socketUser.userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const room = await store.endSession(roomId);
      if (room) {
        io.to(roomId.toUpperCase()).emit('session_ended', { room });
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      const socketUser = store.getSocketUser(socket.id);
      if (socketUser) {
        await store.disconnectUser(socketUser.roomId, socketUser.userId);
        socket.to(socketUser.roomId).emit('user_disconnected', { 
          userId: socketUser.userId 
        });
        store.removeSocket(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    } catch (error) {
      console.error('Error on disconnect:', error);
    }
  });
});

// Cleanup old rooms every hour
setInterval(async () => {
  try {
    await store.cleanup(24);
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
}, 60 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await store.connect();
    server.listen(PORT, () => {
      console.log(`Planning Poker server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
