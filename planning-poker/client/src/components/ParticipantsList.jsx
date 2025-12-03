import React from 'react';
import { motion } from 'framer-motion';
import { getAvatar } from '../utils/avatars';
import { getCardColor } from '../utils/deck';
import './ParticipantsList.css';

function ParticipantsList({ users, votingStatus, currentUserId, hostId, revealedVotes }) {
  return (
    <div className="participants-panel card">
      <h3 className="panel-title">
        Participants <span className="count">{users.length}</span>
      </h3>
      <ul className="participants-list">
        {users.map((user, index) => {
          const avatar = getAvatar(user.avatarId);
          const hasVoted = votingStatus[user.id];
          const revealedValue = revealedVotes?.[user.id];
          const isMe = user.id === currentUserId;
          const isHost = user.id === hostId;

          return (
            <motion.li
              key={user.id}
              className={`participant ${!user.connected ? 'disconnected' : ''} ${isMe ? 'is-me' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <motion.div 
                className="participant-avatar"
                style={{ background: avatar.bgGradient }}
                animate={hasVoted && !revealedVotes ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <span className="avatar-emoji">{avatar.emoji}</span>
              </motion.div>
              
              <div className="participant-info">
                <span className="participant-name">
                  {user.displayName}
                  {isMe && <span className="you-badge">you</span>}
                  {isHost && <span className="host-badge">host</span>}
                </span>
                {!user.connected && (
                  <span className="status-offline">offline</span>
                )}
              </div>

              <div className="participant-status">
                {revealedVotes ? (
                  revealedValue !== undefined ? (
                    <motion.div 
                      className="revealed-vote"
                      style={{ 
                        background: getCardColor(revealedValue),
                        boxShadow: `0 2px 10px ${getCardColor(revealedValue)}40`
                      }}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      {revealedValue}
                    </motion.div>
                  ) : (
                    <span className="no-vote-badge">🐌</span>
                  )
                ) : hasVoted ? (
                  <motion.span 
                    className="voted-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    ✅
                  </motion.span>
                ) : (
                  <span className="waiting-badge">⏳</span>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default ParticipantsList;
