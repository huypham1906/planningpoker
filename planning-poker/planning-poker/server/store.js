// In-memory data store for Planning Poker
import { v4 as uuidv4 } from 'uuid';

class Store {
  constructor() {
    this.rooms = new Map();
    this.userSockets = new Map(); // socketId -> { roomId, oderId }
  }

  // Room operations
  createRoom(hostName, roomName, hostAvatarId) {
    const roomId = uuidv4().slice(0, 8);
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
      avatarId: hostAvatarId || 'pikachu',
      role: 'host',
      connected: true
    };

    this.rooms.set(roomId, {
      room,
      users: new Map([[hostId, host]]),
      votes: new Map() // storyId -> Map(userId -> vote)
    });

    return { room, host };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId, displayName, avatarId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const userId = uuidv4();
    const user = {
      id: userId,
      roomId,
      displayName,
      avatarId: avatarId || 'charmander',
      role: 'participant',
      connected: true
    };

    roomData.users.set(userId, user);
    return { room: roomData.room, user, users: Array.from(roomData.users.values()) };
  }

  reconnectUser(roomId, userId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const user = roomData.users.get(userId);
    if (user) {
      user.connected = true;
      return { room: roomData.room, user, users: Array.from(roomData.users.values()) };
    }
    return null;
  }

  disconnectUser(roomId, userId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return;

    const user = roomData.users.get(userId);
    if (user) {
      user.connected = false;
    }
  }

  getUsers(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return [];
    return Array.from(roomData.users.values());
  }

  updateUser(roomId, userId, updates) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const user = roomData.users.get(userId);
    if (user) {
      Object.assign(user, updates);
      return user;
    }
    return null;
  }

  updateRoomSettings(roomId, settings) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    Object.assign(roomData.room.settings, settings);
    roomData.room.updatedAt = new Date().toISOString();
    return roomData.room;
  }

  // Story operations
  addStory(roomId, story) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const newStory = {
      id: uuidv4(),
      roomId,
      title: story.title,
      description: story.description || '',
      link: story.link || '',
      finalEstimate: null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    roomData.room.stories.push(newStory);
    roomData.votes.set(newStory.id, new Map());
    return newStory;
  }

  getStories(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return [];
    return roomData.room.stories;
  }

  setCurrentStory(roomId, storyId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    roomData.room.currentStoryId = storyId;
    const story = roomData.room.stories.find(s => s.id === storyId);
    if (story) {
      story.status = 'estimating';
    }
    return story;
  }

  // Voting operations
  startRound(roomId, storyId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    // Clear previous votes for this story
    roomData.votes.set(storyId, new Map());
    
    roomData.room.currentRound = {
      storyId,
      startedAt: new Date().toISOString(),
      timerStartedAt: null,
      timerEndsAt: null,
      revealed: false,
      locked: false
    };

    return roomData.room.currentRound;
  }

  startTimer(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData || !roomData.room.currentRound) return null;

    const now = new Date();
    const endsAt = new Date(now.getTime() + roomData.room.settings.countdownSeconds * 1000);
    
    roomData.room.currentRound.timerStartedAt = now.toISOString();
    roomData.room.currentRound.timerEndsAt = endsAt.toISOString();

    return {
      timerStartedAt: roomData.room.currentRound.timerStartedAt,
      timerEndsAt: roomData.room.currentRound.timerEndsAt,
      countdownSeconds: roomData.room.settings.countdownSeconds
    };
  }

  stopTimer(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData || !roomData.room.currentRound) return null;

    roomData.room.currentRound.timerStartedAt = null;
    roomData.room.currentRound.timerEndsAt = null;
    return true;
  }

  lockRound(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData || !roomData.room.currentRound) return null;

    roomData.room.currentRound.locked = true;
    return true;
  }

  castVote(roomId, storyId, oderId, value) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const round = roomData.room.currentRound;
    if (!round || round.storyId !== storyId || round.locked || round.revealed) {
      return null;
    }

    let storyVotes = roomData.votes.get(storyId);
    if (!storyVotes) {
      storyVotes = new Map();
      roomData.votes.set(storyId, storyVotes);
    }

    storyVotes.set(oderId, {
      value,
      timestamp: new Date().toISOString()
    });

    return { oderId, voted: true };
  }

  getVotes(roomId, storyId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return new Map();
    return roomData.votes.get(storyId) || new Map();
  }

  getVotingStatus(roomId, storyId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return {};

    const votes = roomData.votes.get(storyId) || new Map();
    const status = {};
    
    for (const [userId, user] of roomData.users) {
      status[userId] = votes.has(userId);
    }

    return status;
  }

  revealVotes(roomId, storyId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData || !roomData.room.currentRound) return null;

    roomData.room.currentRound.revealed = true;
    roomData.room.currentRound.locked = true;

    const votes = roomData.votes.get(storyId) || new Map();
    const voteResults = {};
    const values = [];

    for (const [userId, vote] of votes) {
      voteResults[userId] = vote.value;
      if (typeof vote.value === 'number') {
        values.push(vote.value);
      }
    }

    // Calculate summary
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

    // Calculate mode
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

    // Check consensus (all same value or 80%+ agreement)
    const consensus = maxFreq >= values.length * 0.8;

    return { min, max, average: Math.round(average * 10) / 10, mode, consensus };
  }

  setFinalEstimate(roomId, storyId, value) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const story = roomData.room.stories.find(s => s.id === storyId);
    if (story) {
      story.finalEstimate = value;
      story.status = 'estimated';
      return story;
    }
    return null;
  }

  endSession(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    roomData.room.status = 'ended';
    return roomData.room;
  }

  getRoomState(roomId) {
    const roomData = this.rooms.get(roomId);
    if (!roomData) return null;

    const currentStoryId = roomData.room.currentStoryId;
    const votingStatus = currentStoryId ? this.getVotingStatus(roomId, currentStoryId) : {};

    return {
      room: roomData.room,
      users: Array.from(roomData.users.values()),
      votingStatus,
      currentRound: roomData.room.currentRound
    };
  }

  // Cleanup old rooms (call periodically)
  cleanup(maxAgeHours = 24) {
    const now = new Date();
    for (const [roomId, roomData] of this.rooms) {
      const updatedAt = new Date(roomData.room.updatedAt);
      const ageHours = (now - updatedAt) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        this.rooms.delete(roomId);
      }
    }
  }

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
