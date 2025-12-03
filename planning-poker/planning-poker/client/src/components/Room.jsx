import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { getAvatar } from '../utils/avatars';
import { getDeck } from '../utils/deck';
import ParticipantsList from './ParticipantsList';
import CardDeck from './CardDeck';
import StoryPanel from './StoryPanel';
import CountdownTimer from './CountdownTimer';
import VoteResults from './VoteResults';
import Toast from './Toast';
import confetti from 'canvas-confetti';
import './Room.css';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showAddStory, setShowAddStory] = useState(false);
  
  const {
    isConnected,
    roomState,
    userId,
    error,
    votingStatus,
    revealedVotes,
    timerInfo,
    isRoundLocked,
    myVote,
    joinRoom,
    hostJoinRoom,
    changeAvatar,
    updateRoomSettings,
    addStory,
    setCurrentStory,
    startRound,
    startTimer,
    stopTimer,
    castVote,
    revealVotes,
    selectFinalEstimate,
    endSession
  } = useSocket();

  // Join room on mount
  useEffect(() => {
    if (!isConnected) return;

    const hostId = sessionStorage.getItem('hostId');
    const userName = sessionStorage.getItem('userName');
    const userAvatar = sessionStorage.getItem('userAvatar');

    if (hostId) {
      // Host reconnecting
      hostJoinRoom(roomId, hostId);
    } else if (userName && userAvatar) {
      // Participant joining
      joinRoom(roomId, userName, userAvatar);
    } else {
      // No session info, redirect to join page
      navigate(`/r/${roomId}`);
    }
  }, [isConnected, roomId]);

  // Trigger confetti on consensus
  useEffect(() => {
    if (revealedVotes?.summary?.consensus) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [revealedVotes]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/r/${roomId}`;
    navigator.clipboard.writeText(link);
    setToast({ message: 'Room link copied! ✅', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddStory = (story) => {
    addStory(roomId, story);
    setShowAddStory(false);
  };

  const handleVote = (value) => {
    if (!roomState?.room?.currentStoryId || isRoundLocked) return;
    castVote(roomId, roomState.room.currentStoryId, value);
  };

  const handleReveal = () => {
    if (!roomState?.room?.currentStoryId) return;
    revealVotes(roomId, roomState.room.currentStoryId);
  };

  const handleSelectFinalEstimate = (value) => {
    if (!roomState?.room?.currentStoryId) return;
    selectFinalEstimate(roomId, roomState.room.currentStoryId, value);
  };

  const handleStartNewRound = () => {
    if (!roomState?.room?.currentStoryId) return;
    startRound(roomId, roomState.room.currentStoryId);
  };

  if (!isConnected) {
    return (
      <div className="room-page">
        <div className="room-loading">
          <motion.div 
            className="loading-icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            🎴
          </motion.div>
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="room-page">
        <div className="room-loading">
          <motion.div 
            className="loading-icon"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🎴
          </motion.div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  const isHost = roomState.room.hostId === userId;
  const currentStory = roomState.room.stories.find(
    s => s.id === roomState.room.currentStoryId
  );
  const deck = getDeck(
    roomState.room.settings.includeQuestionMark,
    roomState.room.settings.includeCoffee
  );

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-info">
          <h1 className="room-title">{roomState.room.name}</h1>
          <span className="room-code-badge">{roomId}</span>
        </div>
        <div className="room-actions">
          <motion.button
            className="btn btn-ghost btn-small"
            onClick={handleCopyLink}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📋 Share Link
          </motion.button>
          {isHost && (
            <motion.button
              className="btn btn-ghost btn-small"
              onClick={() => setShowAddStory(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ➕ Add Story
            </motion.button>
          )}
        </div>
      </header>

      <main className="room-main">
        <div className="room-content">
          {/* Current Story */}
          <section className="current-story-section">
            {currentStory ? (
              <motion.div 
                className="current-story card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentStory.id}
              >
                <div className="story-header">
                  <span className="story-badge">Current Story</span>
                  {currentStory.status === 'estimated' && (
                    <span className="estimate-badge">
                      Estimated: {currentStory.finalEstimate}
                    </span>
                  )}
                </div>
                <h2 className="story-title">{currentStory.title}</h2>
                {currentStory.description && (
                  <p className="story-description">{currentStory.description}</p>
                )}
                {currentStory.link && (
                  <a 
                    href={currentStory.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="story-link"
                  >
                    🔗 View in Jira
                  </a>
                )}
              </motion.div>
            ) : (
              <div className="no-story card">
                <span className="no-story-icon">📝</span>
                <p>No story selected</p>
                {isHost && (
                  <p className="text-dim">Add stories and select one to start estimating</p>
                )}
              </div>
            )}

            {/* Timer */}
            {timerInfo && (
              <CountdownTimer 
                timerEndsAt={timerInfo.timerEndsAt}
                onComplete={() => {}}
              />
            )}

            {/* Vote Results */}
            <AnimatePresence>
              {revealedVotes && (
                <VoteResults 
                  votes={revealedVotes.votes}
                  summary={revealedVotes.summary}
                  users={roomState.users}
                  isHost={isHost}
                  onSelectFinal={handleSelectFinalEstimate}
                  deck={deck}
                />
              )}
            </AnimatePresence>

            {/* Host Controls */}
            {isHost && currentStory && (
              <div className="host-controls">
                {!revealedVotes ? (
                  <>
                    {!timerInfo ? (
                      <motion.button
                        className="btn btn-secondary btn-small"
                        onClick={() => startTimer(roomId)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ⏱️ Start Timer ({roomState.room.settings.countdownSeconds}s)
                      </motion.button>
                    ) : (
                      <motion.button
                        className="btn btn-ghost btn-small"
                        onClick={() => stopTimer(roomId)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ⏹️ Stop Timer
                      </motion.button>
                    )}
                    <motion.button
                      className="btn btn-primary btn-small"
                      onClick={handleReveal}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      👁️ Reveal Votes
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    className="btn btn-secondary btn-small"
                    onClick={handleStartNewRound}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    🔄 New Round
                  </motion.button>
                )}
              </div>
            )}
          </section>

          {/* Card Deck */}
          {currentStory && !revealedVotes && (
            <section className="deck-section">
              <CardDeck 
                deck={deck}
                selectedValue={myVote}
                onSelect={handleVote}
                disabled={isRoundLocked}
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="room-sidebar">
          <ParticipantsList 
            users={roomState.users}
            votingStatus={votingStatus}
            currentUserId={userId}
            hostId={roomState.room.hostId}
            revealedVotes={revealedVotes?.votes}
          />

          {roomState.room.stories.length > 0 && (
            <StoryPanel 
              stories={roomState.room.stories}
              currentStoryId={roomState.room.currentStoryId}
              isHost={isHost}
              onSelectStory={(storyId) => {
                setCurrentStory(roomId, storyId);
                startRound(roomId, storyId);
              }}
            />
          )}
        </aside>
      </main>

      {/* Add Story Modal */}
      <AnimatePresence>
        {showAddStory && (
          <AddStoryModal 
            onAdd={handleAddStory}
            onClose={() => setShowAddStory(false)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

// Add Story Modal Component
function AddStoryModal({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim(), link: link.trim() });
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="modal card"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Add Story</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. User login flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="input"
              placeholder="Brief description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label>Link (Jira, etc.)</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              Add Story
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default Room;
