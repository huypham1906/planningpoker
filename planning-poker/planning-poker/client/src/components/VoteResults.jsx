import React from 'react';
import { motion } from 'framer-motion';
import { getCardColor } from '../utils/deck';
import './VoteResults.css';

function VoteResults({ votes, summary, users, isHost, onSelectFinal, deck }) {
  const voteEntries = Object.entries(votes);
  const numericVotes = voteEntries
    .filter(([, value]) => typeof value === 'number')
    .map(([, value]) => value);

  return (
    <motion.div 
      className="vote-results card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h3 className="results-title">
        {summary.consensus ? '🎉 Consensus!' : '📊 Results'}
      </h3>

      {/* Summary Stats */}
      <div className="results-summary">
        {summary.mode !== null && (
          <div className="summary-stat primary">
            <span className="stat-label">Most Common</span>
            <span 
              className="stat-value"
              style={{ color: getCardColor(summary.mode) }}
            >
              {summary.mode}
            </span>
          </div>
        )}
        {summary.min !== null && summary.max !== null && (
          <div className="summary-stat">
            <span className="stat-label">Range</span>
            <span className="stat-value">{summary.min} - {summary.max}</span>
          </div>
        )}
        {summary.average !== null && (
          <div className="summary-stat">
            <span className="stat-label">Average</span>
            <span className="stat-value">{summary.average}</span>
          </div>
        )}
      </div>

      {/* Vote Distribution */}
      {numericVotes.length > 0 && (
        <div className="vote-distribution">
          {deck
            .filter(card => typeof card.value === 'number')
            .map(card => {
              const count = numericVotes.filter(v => v === card.value).length;
              if (count === 0) return null;
              
              const percentage = (count / voteEntries.length) * 100;
              const isOutlier = summary.mode !== null && 
                Math.abs(card.value - summary.mode) > 5;
              
              return (
                <motion.div 
                  key={card.value}
                  className={`distribution-bar ${isOutlier ? 'outlier' : ''}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bar-label">{card.value}</span>
                  <div className="bar-track">
                    <motion.div 
                      className="bar-fill"
                      style={{ 
                        background: getCardColor(card.value),
                        width: `${percentage}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Host: Select Final Estimate */}
      {isHost && (
        <div className="final-estimate-section">
          <p className="section-label">Select final estimate:</p>
          <div className="estimate-options">
            {deck.map(card => (
              <motion.button
                key={card.value}
                className="estimate-option"
                style={{ 
                  '--btn-color': card.color,
                  '--btn-glow': `${card.color}40`
                }}
                onClick={() => onSelectFinal(card.value)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {card.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default VoteResults;
