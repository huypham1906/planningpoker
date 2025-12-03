import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { store } from './store.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/rooms', (req, res) => {
  const { hostName, roomName, avatarId } = req.body;
  
  if (!hostName) {
    return res.status(400).json({ error: 'Host name is required' });
  }

  const { room, host } = store.createRoom(hostName, roomName, avatarId);
  res.json({ room, host });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const roomData = store.getRoom(req.params.roomId);
  
  if (!roomData) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({ 
    room: roomData.room,
    exists: true 
  });
});

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room
  socket.on('join_room', ({ roomId, displayName, avatarId, userId }) => {
    // Check if reconnecting
    if (userId) {
      const result = store.reconnectUser(roomId, oderId);
      if (result) {
        socket.join(roomId);
        store.mapSocketToUser(socket.id, roomId, oderId);
        
        const roomState = store.getRoomState(roomId);
        socket.emit('room_state', roomState);
        socket.to(roomId).emit('user_reconnected', { userId });
        return;
      }
    }

    // New user joining
    const result = store.joinRoom(roomId, displayName, avatarId);
    if (!result) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    socket.join(roomId);
    store.mapSocketToUser(socket.id, roomId, result.user.id);

    const roomState = store.getRoomState(roomId);
    socket.emit('room_state', { ...roomState, userId: result.user.id });
    socket.to(roomId).emit('user_joined', { user: result.user });
  });

  // Host joins their created room
  socket.on('host_join_room', ({ roomId, hostId }) => {
    socket.join(roomId);
    store.mapSocketToUser(socket.id, roomId, hostId);
    
    const roomState = store.getRoomState(roomId);
    socket.emit('room_state', { ...roomState, userId: hostId });
  });

  // Change avatar
  socket.on('change_avatar', ({ roomId, avatarId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const user = store.updateUser(roomId, socketUser.userId, { avatarId });
    if (user) {
      io.to(roomId).emit('user_updated', { user });
    }
  });

  // Update room settings (host only)
  socket.on('update_room_settings', ({ roomId, settings }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const room = store.updateRoomSettings(roomId, settings);
    if (room) {
      io.to(roomId).emit('room_settings_updated', { settings: room.settings });
    }
  });

  // Add story (host only)
  socket.on('add_story', ({ roomId, story }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const newStory = store.addStory(roomId, story);
    if (newStory) {
      io.to(roomId).emit('story_added', { story: newStory });
    }
  });

  // Set current story (host only)
  socket.on('set_current_story', ({ roomId, storyId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const story = store.setCurrentStory(roomId, storyId);
    if (story) {
      io.to(roomId).emit('current_story_changed', { story, storyId });
    }
  });

  // Start round (host only)
  socket.on('start_round', ({ roomId, storyId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const round = store.startRound(roomId, storyId);
    if (round) {
      io.to(roomId).emit('round_started', { round });
    }
  });

  // Start timer (host only)
  socket.on('start_timer', ({ roomId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const timerInfo = store.startTimer(roomId);
    if (timerInfo) {
      io.to(roomId).emit('timer_started', timerInfo);

      // Set up auto-lock when timer ends
      setTimeout(() => {
        const currentRoomData = store.getRoom(roomId);
        if (currentRoomData && 
            currentRoomData.room.currentRound && 
            !currentRoomData.room.currentRound.revealed) {
          store.lockRound(roomId);
          io.to(roomId).emit('round_locked', { 
            storyId: currentRoomData.room.currentRound.storyId 
          });
        }
      }, timerInfo.countdownSeconds * 1000);
    }
  });

  // Stop timer (host only)
  socket.on('stop_timer', ({ roomId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    if (store.stopTimer(roomId)) {
      io.to(roomId).emit('timer_stopped', {});
    }
  });

  // Cast vote
  socket.on('cast_vote', ({ roomId, storyId, value }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const result = store.castVote(roomId, storyId, socketUser.userId, value);
    if (result) {
      // Broadcast voting status update (not the actual vote)
      const votingStatus = store.getVotingStatus(roomId, storyId);
      io.to(roomId).emit('voting_status_updated', { votingStatus });
      
      // Confirm to voter
      socket.emit('vote_confirmed', { storyId, value });
    }
  });

  // Reveal votes (host only)
  socket.on('reveal_votes', ({ roomId, storyId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const result = store.revealVotes(roomId, storyId);
    if (result) {
      io.to(roomId).emit('votes_revealed', {
        storyId,
        votes: result.votes,
        summary: result.summary
      });
    }
  });

  // Select final estimate (host only)
  socket.on('select_final_estimate', ({ roomId, storyId, value }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const story = store.setFinalEstimate(roomId, storyId, value);
    if (story) {
      io.to(roomId).emit('final_estimate_selected', { story });
    }
  });

  // End session (host only)
  socket.on('end_session', ({ roomId }) => {
    const socketUser = store.getSocketUser(socket.id);
    if (!socketUser) return;

    const roomData = store.getRoom(roomId);
    if (!roomData || roomData.room.hostId !== socketUser.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const room = store.endSession(roomId);
    if (room) {
      io.to(roomId).emit('session_ended', { room });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const socketUser = store.getSocketUser(socket.id);
    if (socketUser) {
      store.disconnectUser(socketUser.roomId, socketUser.userId);
      socket.to(socketUser.roomId).emit('user_disconnected', { 
        userId: socketUser.userId 
      });
      store.removeSocket(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Cleanup old rooms every hour
setInterval(() => {
  store.cleanup(24);
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});
