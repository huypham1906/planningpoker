import React from 'react';
import { motion } from 'framer-motion';
import { avatars } from '../utils/avatars';
import './AvatarSelector.css';

function AvatarSelector({ selected, onSelect, compact = false }) {
  return (
    <div className={`avatar-grid ${compact ? 'avatar-grid-compact' : ''}`}>
      {avatars.map((avatar, index) => (
        <motion.button
          key={avatar.id}
          type="button"
          className={`avatar-option ${selected === avatar.id ? 'selected' : ''}`}
          onClick={() => onSelect(avatar.id)}
          style={{
            background: selected === avatar.id ? avatar.bgGradient : undefined
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="avatar-emoji">{avatar.emoji}</span>
          {!compact && <span className="avatar-name">{avatar.name}</span>}
        </motion.button>
      ))}
    </div>
  );
}

export default AvatarSelector;
