import React from 'react';
import { motion } from 'framer-motion';
import './CardDeck.css';

function CardDeck({ deck, selectedValue, onSelect, disabled }) {
  return (
    <div className="card-deck">
      <p className="deck-label">Choose your estimate</p>
      <div className="cards-container">
        {deck.map((card, index) => {
          const isSelected = selectedValue === card.value;
          
          return (
            <motion.button
              key={card.value}
              className={`poker-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onSelect(card.value)}
              disabled={disabled}
              style={{
                '--card-color': card.color,
                '--card-glow': `${card.color}40`
              }}
              initial={{ opacity: 0, y: 20, rotateY: -90 }}
              animate={{ 
                opacity: 1, 
                rotateY: 0,
                scale: isSelected ? 1.1 : 1,
                y: isSelected ? -10 : 0
              }}
              transition={{ 
                delay: index * 0.05,
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
              whileHover={!disabled ? { 
                scale: 1.08, 
                y: -8,
                rotateZ: Math.random() * 4 - 2
              } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
            >
              <div className="card-inner">
                <span className="card-value">{card.label}</span>
                <div className="card-corner top-left">{card.label}</div>
                <div className="card-corner bottom-right">{card.label}</div>
              </div>
              {isSelected && (
                <motion.div 
                  className="selected-indicator"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      {disabled && (
        <motion.p 
          className="deck-disabled-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          🔒 Voting is locked
        </motion.p>
      )}
    </div>
  );
}

export default CardDeck;
