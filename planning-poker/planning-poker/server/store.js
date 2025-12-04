// MongoDB-based data store for Planning Poker
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pokeruser:Poker123456@planningpoker.peuhwqu.mongodb.net/?appName=PlanningPoker';
const DB_NAME = 'planningpoker';

class Store {
  constructor() {
    this.client = null;
    this.db = null;
    this.userSockets = new Map(); // socketId -> { roomId, userId } - kept in memory for socket mapping
  }

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      
      // Create indexes for better performance
      await this.db.collection('rooms').createIndex({ id: 1 }, { unique: true });
      await this.db.collection('rooms').createIndex({ updatedAt: 1 });
      
      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  // Room operations
  async createRoom(hostName, roomName, hostAvatarId) {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const hostId = uuidv4();
    
    const room = {
      id: roomId,
      name: roomName || `Room ${roomId}`,
      hostId,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const host = {
      id: hostId,
      roomId,
      displayName: hostName,
      avatarId: hostAvatarId || 'sparky',
      role: 'host',
      connected: true
    };

    const roomDoc = {
      ...room,
      users: [host],
      votes: {} // storyId -> { userId: vote }
    };

    await this.db.collection('rooms').insertOne(roomDoc);
    console.log(`Room created: ${roomId}`);

    return { room, host };
  }

  async getRoom(roomId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc) return null;
    
    return {
      room: {
        id: roomDoc.id,
        name: roomDoc.name,
        hostId: roomDoc.hostId,
        settings: roomDoc.settings,
        stories: roomDoc.stories,
        currentStoryId: roomDoc.currentStoryId,
        currentRound: roomDoc.currentRound,
        status: roomDoc.status,
        createdAt: roomDoc.createdAt,
        updatedAt: roomDoc.updatedAt
      },
      users: roomDoc.users || [],
      votes: roomDoc.votes || {}
    };
  }

  async joinRoom(roomId, displayName, avatarId) {
    const userId = uuidv4();
    const user = {
      id: userId,
      roomId: roomId.toUpperCase(),
      displayName,
      avatarId: avatarId || 'blazey',
      role: 'participant',
      connected: true
    };

    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase() },
      { 
        $push: { users: user },
        $set: { updatedAt: new Date().toISOString() }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return { 
      room: result, 
      user, 
      users: result.users 
    };
  }

  async reconnectUser(roomId, userId) {
    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase(), 'users.id': userId },
      { 
        $set: { 
          'users.$.connected': true,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    const user = result.users.find(u => u.id === userId);
    return { room: result, user, users: result.users };
  }

  async disconnectUser(roomId, userId) {
    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase(), 'users.id': userId },
      { 
        $set: { 
          'users.$.connected': false,
          updatedAt: new Date().toISOString()
        }
      }
    );
  }

  async getUsers(roomId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    return roomDoc?.users || [];
  }

  async updateUser(roomId, userId, updates) {
    const updateFields = {};
    for (const [key, value] of Object.entries(updates)) {
      updateFields[`users.$.${key}`] = value;
    }

    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase(), 'users.id': userId },
      { 
        $set: { 
          ...updateFields,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return result.users.find(u => u.id === userId);
  }

  async updateRoomSettings(roomId, settings) {
    const updateFields = {};
    for (const [key, value] of Object.entries(settings)) {
      updateFields[`settings.${key}`] = value;
    }

    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          ...updateFields,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Story operations
  async addStory(roomId, story) {
    const newStory = {
      id: uuidv4(),
      roomId: roomId.toUpperCase(),
      title: story.title,
      description: story.description || '',
      link: story.link || '',
      finalEstimate: null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $push: { stories: newStory },
        $set: { 
          [`votes.${newStory.id}`]: {},
          updatedAt: new Date().toISOString()
        }
      }
    );

    return newStory;
  }

  async getStories(roomId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    return roomDoc?.stories || [];
  }

  async setCurrentStory(roomId, storyId) {
    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          currentStoryId: storyId,
          'stories.$[story].status': 'estimating',
          updatedAt: new Date().toISOString()
        }
      },
      { 
        arrayFilters: [{ 'story.id': storyId }],
        returnDocument: 'after'
      }
    );

    if (!result) return null;
    return result.stories.find(s => s.id === storyId);
  }

  // Voting operations
  async startRound(roomId, storyId) {
    const currentRound = {
      storyId,
      startedAt: new Date().toISOString(),
      timerStartedAt: null,
      timerEndsAt: null,
      revealed: false,
      locked: false
    };

    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          currentRound,
          [`votes.${storyId}`]: {},
          updatedAt: new Date().toISOString()
        }
      }
    );

    return currentRound;
  }

  async startTimer(roomId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc || !roomDoc.currentRound) return null;

    const now = new Date();
    const endsAt = new Date(now.getTime() + roomDoc.settings.countdownSeconds * 1000);

    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          'currentRound.timerStartedAt': now.toISOString(),
          'currentRound.timerEndsAt': endsAt.toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    return {
      timerStartedAt: now.toISOString(),
      timerEndsAt: endsAt.toISOString(),
      countdownSeconds: roomDoc.settings.countdownSeconds
    };
  }

  async stopTimer(roomId) {
    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          'currentRound.timerStartedAt': null,
          'currentRound.timerEndsAt': null,
          updatedAt: new Date().toISOString()
        }
      }
    );
    return true;
  }

  async lockRound(roomId) {
    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          'currentRound.locked': true,
          updatedAt: new Date().toISOString()
        }
      }
    );
    return true;
  }

  async castVote(roomId, storyId, userId, value) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc) return null;

    const round = roomDoc.currentRound;
    if (!round || round.storyId !== storyId || round.locked || round.revealed) {
      return null;
    }

    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          [`votes.${storyId}.${userId}`]: {
            value,
            timestamp: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        }
      }
    );

    return { userId, voted: true };
  }

  async getVotes(roomId, storyId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc) return {};
    return roomDoc.votes?.[storyId] || {};
  }

  async getVotingStatus(roomId, storyId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc) return {};

    const votes = roomDoc.votes?.[storyId] || {};
    const status = {};
    
    for (const user of roomDoc.users) {
      status[user.id] = !!votes[user.id];
    }

    return status;
  }

  async revealVotes(roomId, storyId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc || !roomDoc.currentRound) return null;

    await this.db.collection('rooms').updateOne(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          'currentRound.revealed': true,
          'currentRound.locked': true,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const votes = roomDoc.votes?.[storyId] || {};
    const voteResults = {};
    const values = [];

    for (const [userId, vote] of Object.entries(votes)) {
      voteResults[userId] = vote.value;
      if (typeof vote.value === 'number') {
        values.push(vote.value);
      }
    }

    const summary = this.calculateSummary(values);

    return { votes: voteResults, summary };
  }

  calculateSummary(values) {
    if (values.length === 0) {
      return { min: null, max: null, average: null, mode: null, consensus: false };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    const frequency = {};
    let maxFreq = 0;
    let mode = null;
    for (const v of values) {
      frequency[v] = (frequency[v] || 0) + 1;
      if (frequency[v] > maxFreq) {
        maxFreq = frequency[v];
        mode = v;
      }
    }

    const consensus = maxFreq >= values.length * 0.8;

    return { min, max, average: Math.round(average * 10) / 10, mode, consensus };
  }

  async setFinalEstimate(roomId, storyId, value) {
    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase(), 'stories.id': storyId },
      { 
        $set: { 
          'stories.$.finalEstimate': value,
          'stories.$.status': 'estimated',
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return result.stories.find(s => s.id === storyId);
  }

  async endSession(roomId) {
    const result = await this.db.collection('rooms').findOneAndUpdate(
      { id: roomId.toUpperCase() },
      { 
        $set: { 
          status: 'ended',
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async getRoomState(roomId) {
    const roomDoc = await this.db.collection('rooms').findOne({ id: roomId.toUpperCase() });
    if (!roomDoc) return null;

    const currentStoryId = roomDoc.currentStoryId;
    const votingStatus = currentStoryId ? await this.getVotingStatus(roomId, currentStoryId) : {};

    return {
      room: {
        id: roomDoc.id,
        name: roomDoc.name,
        hostId: roomDoc.hostId,
        settings: roomDoc.settings,
        stories: roomDoc.stories,
        currentStoryId: roomDoc.currentStoryId,
        currentRound: roomDoc.currentRound,
        status: roomDoc.status
      },
      users: roomDoc.users,
      votingStatus,
      currentRound: roomDoc.currentRound
    };
  }

  // Cleanup old rooms
  async cleanup(maxAgeHours = 24) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const result = await this.db.collection('rooms').deleteMany({
      updatedAt: { $lt: cutoff.toISOString() }
    });
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} old rooms`);
    }
  }

  // Socket mapping (kept in memory - only for current connections)
  mapSocketToUser(socketId, roomId, userId) {
    this.userSockets.set(socketId, { roomId, userId });
  }

  getSocketUser(socketId) {
    return this.userSockets.get(socketId);
  }

  removeSocket(socketId) {
    this.userSockets.delete(socketId);
  }
}

export const store = new Store();
