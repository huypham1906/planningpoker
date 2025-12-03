import React from 'react';
import { motion } from 'framer-motion';
import './Toast.css';

function Toast({ message, type = 'success' }) {
  return (
    <motion.div 
      className={`toast toast-${type}`}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
    >
      {message}
    </motion.div>
  );
}

export default Toast;
