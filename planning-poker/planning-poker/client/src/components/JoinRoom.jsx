import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AvatarSelector from './AvatarSelector';
import { getRandomAvatar } from '../utils/avatars';
import './JoinRoom.css';

function JoinRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(getRandomAvatar().id);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if room exists
    const checkRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();
        
        if (!response.ok || !data.exists) {
          setError('Room not found. Please check the code and try again.');
        } else {
          setRoomInfo(data.room);
        }
      } catch (err) {
        setError('Unable to connect. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    checkRoom();
  }, [roomId]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    
    // Store user info and navigate to room
    sessionStorage.setItem('userName', displayName.trim());
    sessionStorage.setItem('userAvatar', selectedAvatar);
    navigate(`/room/${roomId}`);
  };

  if (isLoading) {
    return (
      <div className="join-page">
        <div className="join-loading">
          <motion.div 
            className="loading-icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            🎴
          </motion.div>
          <p>Finding room...</p>
        </div>
      </div>
    );
  }

  if (error && !roomInfo) {
    return (
      <div className="join-page">
        <motion.div 
          className="join-container card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="join-error">
            <span className="error-icon">😕</span>
            <h2>Oops!</h2>
            <p>{error}</p>
            <motion.button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Go Home
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <motion.div 
        className="join-container card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="join-header">
          <span className="join-icon">🎴</span>
          <h1>Join Room</h1>
          {roomInfo?.name && (
            <p className="room-name">{roomInfo.name}</p>
          )}
          <p className="room-code">Code: <span className="code">{roomId}</span></p>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              maxLength={30}
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
            disabled={isJoining}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isJoining ? 'Joining...' : 'Join Room 🚀'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default JoinRoom;
