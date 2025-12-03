# 🎴 Planning Poker

A real-time Planning Poker application for Scrum teams to estimate user stories using the Fibonacci scale. Features fun animations, Pokémon-style avatars, and real-time synchronization.

![Planning Poker](https://img.shields.io/badge/Planning-Poker-ff6b6b?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io)

## ✨ Features

- **Real-time Collaboration**: Multiple users can join the same room and vote simultaneously
- **Fibonacci Estimation**: Standard Fibonacci scale (0, 1, 2, 3, 5, 8, 13, 21, ?, ☕)
- **Pokémon-style Avatars**: 16 cute creature avatars to choose from
- **Countdown Timer**: Configurable timer to force voting
- **Fun Animations**: Card hover effects, vote reveals with confetti, countdown animations
- **Story Management**: Add, organize, and estimate multiple stories
- **Shareable Links**: Easy room sharing via unique room codes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone or download the project
cd planning-poker

# Install all dependencies
npm run install:all
```

### Development Mode

```bash
# Run both server and client in development mode
npm run dev
```

This will start:
- **Server**: http://localhost:3001
- **Client**: http://localhost:5173

### Production Build

```bash
# Build the client
npm run build

# Start the server (serves both API and static files)
npm start
```

## 📁 Project Structure

```
planning-poker/
├── server/                 # Backend (Node.js + Express + Socket.IO)
│   ├── index.js           # Main server entry
│   ├── store.js           # In-memory data store
│   └── package.json
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks (useSocket)
│   │   ├── utils/         # Utilities (avatars, deck)
│   │   └── styles/        # Global CSS
│   ├── index.html
│   └── package.json
└── package.json           # Root package with scripts
```

## 🎮 How to Use

### For Hosts (Scrum Masters / Product Owners)

1. Go to the landing page
2. Click **"Create Room"**
3. Enter your name and choose an avatar
4. Share the room link with your team
5. Add stories to estimate
6. Select a story to start voting
7. Start the timer (optional)
8. Reveal votes when ready
9. Select the final estimate

### For Participants

1. Click the shared room link
2. Enter your name and choose an avatar
3. Wait for the host to select a story
4. Pick your estimate card
5. Wait for the reveal

## 🛠️ Configuration

### Room Settings

- **Timer Duration**: 30s / 60s / 90s (configurable by host)
- **Deck Options**: Include/exclude ? (unsure) and ☕ (break)

### Environment Variables

```bash
# Server port (default: 3001)
PORT=3001
```

## 🎨 Design

The app features a dark, gaming-inspired aesthetic with:
- Vibrant gradient accents
- Smooth Framer Motion animations
- Playful creature avatars
- Card-based voting interface
- Confetti celebration on consensus

## 🔌 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms/:roomId` | Check if room exists |
| GET | `/api/health` | Health check |

### WebSocket Events

**Client → Server:**
- `join_room` - Join a room
- `host_join_room` - Host joins their room
- `add_story` - Add a story (host only)
- `set_current_story` - Select current story (host only)
- `start_timer` - Start countdown (host only)
- `cast_vote` - Submit a vote
- `reveal_votes` - Reveal all votes (host only)
- `select_final_estimate` - Set final estimate (host only)

**Server → Client:**
- `room_state` - Full room state
- `user_joined` / `user_left` - User events
- `voting_status_updated` - Who has voted
- `votes_revealed` - Vote results with summary
- `timer_started` / `timer_stopped` - Timer events

## 📝 License

MIT License - feel free to use this for your team!

## 🙏 Credits

Built with ❤️ for agile teams everywhere.

---

Made with React, Node.js, Socket.IO, and Framer Motion
