import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// ============ CONFIG ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pokeruser:Poker123456@planningpoker.peuhwqu.mongodb.net/planningpoker?retryWrites=true&w=majority';
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  'https://planningpoker101.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// ============ GLOBAL STATE ============
let db = null;
const userSockets = new Map();

// ============ EXPRESS SETUP ============
const app = express();
const server = createServer(app);

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

// ============ MONGODB CONNECTION ============
async function connectDB() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('planningpoker');
    
    // Create index for faster queries
    await db.collection('rooms').createIndex({ id: 1 }, { unique: true });
    
    console.log('✅ Connected to MongoDB successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

// ============ HELPER FUNCTIONS ============
function generateRoomId() {
  return uuidv4().slice(0, 8).toUpperCase();
}

// ============ REST API ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    db: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/rooms', async (req, res) => {
  console.log('📥 POST /api/rooms', req.body);
  
  if (!db) {
    console.error('❌ Database not connected');
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const { hostName, roomName, avatarId } = req.body;
    
    if (!hostName) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    const roomId = generateRoomId();
    const hostId = uuidv4();

    const room = {
      id: roomId,
      name: roomName || `Room ${roomId}`,
      hostId: hostId,
      settings: {
        deckType: 'fibonacci',
        includeQuestionMark: true,
        includeCoffee: true,
        countdownSeconds: 60
      },
      stories: [],
      currentStoryId: null,
      currentRound: null,
      status: 'active',
      users: [{
        id: hostId,
        roomId: roomId,
        displayName: hostName,
        avatarId: avatarId || 'sparky',
        role: 'host',
        connected: true
      }],
      votes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('rooms').insertOne(room);
    console.log(`✅ Room created: ${roomId} by ${hostName}`);

    // Return response matching what frontend expects
    res.json({ 
      room: {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        settings: room.settings,
        stories: room.stories,
        currentStoryId: room.currentStoryId,
        currentRound: room.currentRound,
        status: room.status
      }, 
      host: {
        id: hostId,
        roomId: roomId,
        displayName: hostName,
        avatarId: avatarId || 'sparky',
        role: 'host',
        connected: true
      }
    });
  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room: ' + error.message });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  console.log(`📥 GET /api/rooms/${roomId}`);

  if (!db) {
    return res.status(500).json({ error: 'Database not connected', exists: false });
  }

  try {
    const room = await db.collection('rooms').findOne({ id: roomId });
    
    if (!room) {
      console.log(`❌ Room not found: ${roomId}`);
      return res.status(404).json({ error: 'Room not found', exists: false });
    }

    console.log(`✅ Room found: ${roomId}`);
    res.json({ 
      room: {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        settings: room.settings,
        status: room.status
      },
      exists: true 
    });
  } catch (error) {
    console.error('❌ Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room', exists: false });
  }
});

// ============ SOCKET.IO EVENTS ============
io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);

  // Join room (for participants)
  socket.on('join_room', async ({ roomId, displayName, avatarId, oderId }) => {
    const rid = roomId.toUpperCase();
    console.log(`📥 join_room: ${displayName} -> ${rid}`);

    if (!db) {
      socket.emit('error', { message: 'Database not connected' });
      return;
    }

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      let user = room.users.find(u => u.id === oderId);
      
      if (!user) {
        // New user joining
        user = {
          id: uuidv4(),
          roomId: rid,
          displayName,
          avatarId: avatarId || 'blazey',
          role: 'participant',
          connected: true
        };

        await db.collection('rooms').updateOne(
          { id: rid },
          { 
            $push: { users: user },
            $set: { updatedAt: new Date().toISOString() }
          }
        );
        console.log(`✅ New user added: ${displayName}`);
      } else {
        // Reconnecting user
        await db.collection('rooms').updateOne(
          { id: rid, 'users.id': oderId },
          { $set: { 'users.$.connected': true } }
        );
        console.log(`✅ User reconnected: ${displayName}`);
      }

      socket.join(rid);
      userSockets.set(socket.id, { roomId: rid, oderId: user.id });

      // Get fresh room state
      const updatedRoom = await db.collection('rooms').findOne({ id: rid });
      
      // Build voting status
      const votingStatus = {};
      if (updatedRoom.currentStoryId && updatedRoom.votes[updatedRoom.currentStoryId]) {
        for (const u of updatedRoom.users) {
          votingStatus[u.id] = !!updatedRoom.votes[updatedRoom.currentStoryId]?.[u.id];
        }
      }

      socket.emit('room_state', {
        room: {
          id: updatedRoom.id,
          name: updatedRoom.name,
          hostId: updatedRoom.hostId,
          settings: updatedRoom.settings,
          stories: updatedRoom.stories,
          currentStoryId: updatedRoom.currentStoryId,
          currentRound: updatedRoom.currentRound,
          status: updatedRoom.status
        },
        users: updatedRoom.users,
        oderId: user.id,
        votingStatus,
        currentRound: updatedRoom.currentRound
      });

      socket.to(rid).emit('user_joined', { user });
    } catch (error) {
      console.error('❌ Error in join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Host joins room
  socket.on('host_join_room', async ({ roomId, hostId }) => {
    const rid = roomId.toUpperCase();
    console.log(`📥 host_join_room: ${hostId} -> ${rid}`);

    if (!db) {
      socket.emit('error', { message: 'Database not connected' });
      return;
    }

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(rid);
      userSockets.set(socket.id, { roomId: rid, oderId: hostId });

      const votingStatus = {};
      if (room.currentStoryId && room.votes[room.currentStoryId]) {
        for (const u of room.users) {
          votingStatus[u.id] = !!room.votes[room.currentStoryId]?.[u.id];
        }
      }

      socket.emit('room_state', {
        room: {
          id: room.id,
          name: room.name,
          hostId: room.hostId,
          settings: room.settings,
          stories: room.stories,
          currentStoryId: room.currentStoryId,
          currentRound: room.currentRound,
          status: room.status
        },
        users: room.users,
        oderId: hostId,
        votingStatus,
        currentRound: room.currentRound
      });

      console.log(`✅ Host joined room: ${rid}`);
    } catch (error) {
      console.error('❌ Error in host_join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Add story
  socket.on('add_story', async ({ roomId, story }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const newStory = {
        id: uuidv4(),
        title: story.title,
        description: story.description || '',
        link: story.link || '',
        finalEstimate: null,
        status: 'pending'
      };

      await db.collection('rooms').updateOne(
        { id: rid },
        { 
          $push: { stories: newStory },
          $set: { [`votes.${newStory.id}`]: {} }
        }
      );

      io.to(rid).emit('story_added', { story: newStory });
      console.log(`✅ Story added: ${newStory.title}`);
    } catch (error) {
      console.error('❌ Error in add_story:', error);
    }
  });

  // Set current story
  socket.on('set_current_story', async ({ roomId, storyId }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) return;

      await db.collection('rooms').updateOne(
        { id: rid },
        { $set: { currentStoryId: storyId, 'stories.$[s].status': 'estimating' } },
        { arrayFilters: [{ 's.id': storyId }] }
      );

      const story = room.stories.find(s => s.id === storyId);
      io.to(rid).emit('current_story_changed', { story, storyId });
      console.log(`✅ Current story set: ${storyId}`);
    } catch (error) {
      console.error('❌ Error in set_current_story:', error);
    }
  });

  // Start round
  socket.on('start_round', async ({ roomId, storyId }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) return;

      const round = {
        storyId,
        startedAt: new Date().toISOString(),
        timerStartedAt: null,
        timerEndsAt: null,
        revealed: false,
        locked: false
      };

      await db.collection('rooms').updateOne(
        { id: rid },
        { $set: { currentRound: round, [`votes.${storyId}`]: {} } }
      );

      io.to(rid).emit('round_started', { round });
      console.log(`✅ Round started for story: ${storyId}`);
    } catch (error) {
      console.error('❌ Error in start_round:', error);
    }
  });

  // Start timer
  socket.on('start_timer', async ({ roomId }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) return;

      const now = new Date();
      const endsAt = new Date(now.getTime() + room.settings.countdownSeconds * 1000);

      await db.collection('rooms').updateOne(
        { id: rid },
        { $set: { 
          'currentRound.timerStartedAt': now.toISOString(),
          'currentRound.timerEndsAt': endsAt.toISOString()
        }}
      );

      io.to(rid).emit('timer_started', {
        timerStartedAt: now.toISOString(),
        timerEndsAt: endsAt.toISOString(),
        countdownSeconds: room.settings.countdownSeconds
      });

      // Auto-lock when timer ends
      setTimeout(async () => {
        try {
          const currentRoom = await db.collection('rooms').findOne({ id: rid });
          if (currentRoom?.currentRound && !currentRoom.currentRound.revealed) {
            await db.collection('rooms').updateOne(
              { id: rid },
              { $set: { 'currentRound.locked': true } }
            );
            io.to(rid).emit('round_locked', { storyId: currentRoom.currentRound.storyId });
          }
        } catch (e) {
          console.error('Timer auto-lock error:', e);
        }
      }, room.settings.countdownSeconds * 1000);

      console.log(`✅ Timer started: ${room.settings.countdownSeconds}s`);
    } catch (error) {
      console.error('❌ Error in start_timer:', error);
    }
  });

  // Cast vote
  socket.on('cast_vote', async ({ roomId, storyId, value }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || !room.currentRound || room.currentRound.locked || room.currentRound.revealed) return;

      await db.collection('rooms').updateOne(
        { id: rid },
        { $set: { [`votes.${storyId}.${socketUser.oderId}`]: { value, timestamp: new Date().toISOString() } } }
      );

      // Broadcast voting status
      const updatedRoom = await db.collection('rooms').findOne({ id: rid });
      const votingStatus = {};
      for (const u of updatedRoom.users) {
        votingStatus[u.id] = !!updatedRoom.votes[storyId]?.[u.id];
      }

      io.to(rid).emit('voting_status_updated', { votingStatus });
      socket.emit('vote_confirmed', { storyId, value });
      console.log(`✅ Vote cast by ${socketUser.oderId}: ${value}`);
    } catch (error) {
      console.error('❌ Error in cast_vote:', error);
    }
  });

  // Reveal votes
  socket.on('reveal_votes', async ({ roomId, storyId }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) return;

      await db.collection('rooms').updateOne(
        { id: rid },
        { $set: { 'currentRound.revealed': true, 'currentRound.locked': true } }
      );

      const votes = room.votes[storyId] || {};
      const voteResults = {};
      const numericValues = [];

      for (const [oderId, vote] of Object.entries(votes)) {
        voteResults[oderId] = vote.value;
        if (typeof vote.value === 'number') {
          numericValues.push(vote.value);
        }
      }

      // Calculate summary
      let summary = { min: null, max: null, average: null, mode: null, consensus: false };
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        summary.min = sorted[0];
        summary.max = sorted[sorted.length - 1];
        summary.average = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10;
        
        // Find mode
        const freq = {};
        let maxFreq = 0;
        for (const v of numericValues) {
          freq[v] = (freq[v] || 0) + 1;
          if (freq[v] > maxFreq) {
            maxFreq = freq[v];
            summary.mode = v;
          }
        }
        summary.consensus = maxFreq >= numericValues.length * 0.8;
      }

      io.to(rid).emit('votes_revealed', { storyId, votes: voteResults, summary });
      console.log(`✅ Votes revealed for story: ${storyId}`);
    } catch (error) {
      console.error('❌ Error in reveal_votes:', error);
    }
  });

  // Select final estimate
  socket.on('select_final_estimate', async ({ roomId, storyId, value }) => {
    const rid = roomId.toUpperCase();
    const socketUser = userSockets.get(socket.id);
    if (!socketUser || !db) return;

    try {
      const room = await db.collection('rooms').findOne({ id: rid });
      if (!room || room.hostId !== socketUser.oderId) return;

      await db.collection('rooms').updateOne(
        { id: rid, 'stories.id': storyId },
        { $set: { 'stories.$.finalEstimate': value, 'stories.$.status': 'estimated' } }
      );

      const story = room.stories.find(s => s.id === storyId);
      if (story) {
        story.finalEstimate = value;
        story.status = 'estimated';
      }

      io.to(rid).emit('final_estimate_selected', { story: { ...story, finalEstimate: value, status: 'estimated' } });
      console.log(`✅ Final estimate selected: ${value}`);
    } catch (error) {
      console.error('❌ Error in select_final_estimate:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const socketUser = userSockets.get(socket.id);
    if (socketUser && db) {
      try {
        await db.collection('rooms').updateOne(
          { id: socketUser.roomId, 'users.id': socketUser.oderId },
          { $set: { 'users.$.connected': false } }
        );
        socket.to(socketUser.roomId).emit('user_disconnected', { oderId: socketUser.oderId });
        userSockets.delete(socket.id);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    console.log('👤 Client disconnected:', socket.id);
  });
});

// ============ START SERVER ============
async function start() {
  console.log('🚀 Starting Planning Poker Server...');
  
  const connected = await connectDB();
  
  if (!connected) {
    console.error('❌ Failed to connect to MongoDB. Server will NOT accept requests.');
    console.error('Please check MONGODB_URI environment variable.');
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🎯 Planning Poker server running on port ${PORT}`);
    console.log(`📡 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
}

start();
