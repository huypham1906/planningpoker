import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import JoinRoom from './components/JoinRoom';
import Room from './components/Room';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/r/:roomId" element={<JoinRoom />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default App;
