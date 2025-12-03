import React from 'react';
import { motion } from 'framer-motion';
import './StoryPanel.css';

function StoryPanel({ stories, currentStoryId, isHost, onSelectStory }) {
  const pendingStories = stories.filter(s => s.status === 'pending');
  const estimatedStories = stories.filter(s => s.status === 'estimated');

  return (
    <div className="story-panel card">
      <h3 className="panel-title">Stories</h3>
      
      {pendingStories.length > 0 && (
        <div className="story-section">
          <h4 className="section-label">Pending</h4>
          <ul className="story-list">
            {pendingStories.map((story, index) => (
              <motion.li
                key={story.id}
                className={`story-item ${story.id === currentStoryId ? 'current' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="story-item-content">
                  <span className="story-item-title">{story.title}</span>
                </div>
                {isHost && story.id !== currentStoryId && (
                  <motion.button
                    className="start-btn"
                    onClick={() => onSelectStory(story.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Start
                  </motion.button>
                )}
                {story.id === currentStoryId && (
                  <span className="current-badge">Current</span>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {estimatedStories.length > 0 && (
        <div className="story-section">
          <h4 className="section-label">Estimated</h4>
          <ul className="story-list">
            {estimatedStories.map((story, index) => (
              <motion.li
                key={story.id}
                className="story-item estimated"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="story-item-content">
                  <span className="story-item-title">{story.title}</span>
                </div>
                <span className="estimate-value">{story.finalEstimate}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {stories.length === 0 && (
        <p className="no-stories">No stories yet</p>
      )}
    </div>
  );
}

export default StoryPanel;
