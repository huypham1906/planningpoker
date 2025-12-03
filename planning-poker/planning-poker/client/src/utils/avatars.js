// Pokémon-inspired creature avatars
// Using emoji + CSS for a lightweight, cute aesthetic

export const avatars = [
  {
    id: 'sparky',
    name: 'Sparky',
    emoji: '⚡',
    color: '#FFE66D',
    bgGradient: 'linear-gradient(135deg, #FFE66D, #FFA502)'
  },
  {
    id: 'blazey',
    name: 'Blazey',
    emoji: '🔥',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, #FF6B6B, #FF4757)'
  },
  {
    id: 'aqua',
    name: 'Aqua',
    emoji: '💧',
    color: '#4ECDC4',
    bgGradient: 'linear-gradient(135deg, #4ECDC4, #3498DB)'
  },
  {
    id: 'leafy',
    name: 'Leafy',
    emoji: '🌿',
    color: '#6BCB77',
    bgGradient: 'linear-gradient(135deg, #6BCB77, #27AE60)'
  },
  {
    id: 'rocky',
    name: 'Rocky',
    emoji: '🪨',
    color: '#A0A0A0',
    bgGradient: 'linear-gradient(135deg, #A0A0A0, #6C757D)'
  },
  {
    id: 'mystic',
    name: 'Mystic',
    emoji: '🔮',
    color: '#A66CFF',
    bgGradient: 'linear-gradient(135deg, #A66CFF, #9B59B6)'
  },
  {
    id: 'ghosty',
    name: 'Ghosty',
    emoji: '👻',
    color: '#9B59B6',
    bgGradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)'
  },
  {
    id: 'frosty',
    name: 'Frosty',
    emoji: '❄️',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #74B9FF, #0984E3)'
  },
  {
    id: 'sunny',
    name: 'Sunny',
    emoji: '☀️',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #FDCB6E, #F39C12)'
  },
  {
    id: 'moony',
    name: 'Moony',
    emoji: '🌙',
    color: '#636E72',
    bgGradient: 'linear-gradient(135deg, #636E72, #2D3436)'
  },
  {
    id: 'starry',
    name: 'Starry',
    emoji: '⭐',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #FD79A8, #E84393)'
  },
  {
    id: 'stormy',
    name: 'Stormy',
    emoji: '🌪️',
    color: '#636E72',
    bgGradient: 'linear-gradient(135deg, #636E72, #2D3436)'
  },
  {
    id: 'buggy',
    name: 'Buggy',
    emoji: '🐛',
    color: '#00B894',
    bgGradient: 'linear-gradient(135deg, #00B894, #00A884)'
  },
  {
    id: 'birdy',
    name: 'Birdy',
    emoji: '🐦',
    color: '#81ECEC',
    bgGradient: 'linear-gradient(135deg, #81ECEC, #00CEC9)'
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #E17055, #D63031)'
  },
  {
    id: 'fairy',
    name: 'Fairy',
    emoji: '🧚',
    color: '#FFEAA7',
    bgGradient: 'linear-gradient(135deg, #FFEAA7, #FDCB6E)'
  }
];

export const getAvatar = (id) => {
  return avatars.find(a => a.id === id) || avatars[0];
};

export const getRandomAvatar = () => {
  return avatars[Math.floor(Math.random() * avatars.length)];
};
