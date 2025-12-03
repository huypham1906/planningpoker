import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CountdownTimer.css';

function CountdownTimer({ timerEndsAt, onComplete }) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const end = new Date(timerEndsAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setSecondsRemaining(remaining);
      
      if (remaining === 0) {
        onComplete?.();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);

    return () => clearInterval(interval);
  }, [timerEndsAt, onComplete]);

  const isUrgent = secondsRemaining <= 5 && secondsRemaining > 0;
  const isComplete = secondsRemaining === 0;

  return (
    <motion.div 
      className={`countdown-timer ${isUrgent ? 'urgent' : ''} ${isComplete ? 'complete' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="timer-ring">
        <svg viewBox="0 0 100 100">
          <circle
            className="timer-ring-bg"
            cx="50"
            cy="50"
            r="45"
          />
          <motion.circle
            className="timer-ring-progress"
            cx="50"
            cy="50"
            r="45"
            style={{
              strokeDasharray: 283,
              strokeDashoffset: 0
            }}
          />
        </svg>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={secondsRemaining}
          className="timer-value"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ 
            scale: isUrgent ? [1, 1.1, 1] : 1, 
            opacity: 1,
            rotate: isUrgent ? [-2, 2, -2, 0] : 0
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {isComplete ? '⏰' : secondsRemaining}
        </motion.div>
      </AnimatePresence>

      <p className="timer-label">
        {isComplete ? 'Time\'s up!' : 'seconds remaining'}
      </p>
    </motion.div>
  );
}

export default CountdownTimer;
