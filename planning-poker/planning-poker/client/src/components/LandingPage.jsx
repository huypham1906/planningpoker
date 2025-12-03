import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AvatarSelector from './AvatarSelector';
import { getRandomAvatar } from '../utils/avatars';
import './LandingPage.css';

const API_URL = 'https://planning-poker-server-e6rv.onrender.com';

function LandingPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [hostName, setHostName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(getRandomAvatar().id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: hostName.trim(),
          roomName: roomName.trim() || null,
          avatarId: selectedAvatar
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      sessionStorage.setItem('hostId', data.host.id);
      sessionStorage.setItem('userId', data.host.id);
      sessionStorage.setItem('userName', hostName.trim());
      sessionStorage.setItem('userAvatar', selectedAvatar);
      navigate(`/room/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    navigate(`/r/${roomCode.trim()}`);
  };

  return (
    <div className="landing-page">
      <div className="landing-bg-elements">
        <div className="bg-card bg-card-1">🃏</div>
        <div className="bg-card bg-card-2">🎴</div>
        <div className="bg-card bg-card-3">🎲</div>
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
      </div>

      <motion.div 
        className="landing-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="landing-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="logo-icon">🎴</div>
          <h1 className="landing-title">Planning Poker</h1>
          <p className="landing-subtitle">Estimate stories with your team in real-time</p>
        </motion.div>

        {!mode ? (
          <motion.div 
            className="landing-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              className="btn btn-primary btn-large"
              onClick={() => setMode('create')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="btn-icon">✨</span>
              Create Room
            </motion.button>
            
            <motion.button
              className="btn btn-secondary btn-large"
              onClick={() => setMode('join')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="btn-icon">🚀</span>
              Join Room
            </motion.button>
          </motion.div>
        ) : mode === 'create' ? (
          <motion.form 
            className="landing-form card"
            onSubmit={handleCreateRoom}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button 
              type="button" 
              className="back-btn"
              onClick={() => { setMode(null); setError(null); }}
            >
              ← Back
            </button>
            
            <h2>Create a New Room</h2>
            
            <div className="form-group">
              <label>Your Name *</label>
              <input
                type="text"
                className="input"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                autoFocus
                maxLength={30}
              />
            </div>

            <div className="form-group">
              <label>Room Name (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Sprint 42 Planning"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Choose Your Avatar</label>
              <AvatarSelector 
                selected={selectedAvatar} 
                onSelect={setSelectedAvatar} 
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <motion.button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form 
            className="landing-form card"
            onSubmit={handleJoinRoom}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button 
              type="button" 
              className="back-btn"
              onClick={() => { setMode(null); setError(null); }}
            >
              ← Back
            </button>
            
            <h2>Join a Room</h2>
            
            <div className="form-group">
              <label>Room Code</label>
              <input
                type="text"
                className="input input-code"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                autoFocus
                maxLength={10}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <motion.button
              type="submit"
              className="btn btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Continue →
            </motion.button>
          </motion.form>
        )}

        <motion.div 
          className="landing-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>Fibonacci scale estimation • Real-time sync • Fun animations</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LandingPage;
