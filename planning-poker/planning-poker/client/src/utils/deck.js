// Fibonacci deck for Planning Poker

export const FIBONACCI_DECK = [
  { value: 0, label: '0', color: '#6C757D' },
  { value: 1, label: '1', color: '#28A745' },
  { value: 2, label: '2', color: '#28A745' },
  { value: 3, label: '3', color: '#20C997' },
  { value: 5, label: '5', color: '#17A2B8' },
  { value: 8, label: '8', color: '#007BFF' },
  { value: 13, label: '13', color: '#6610F2' },
  { value: 21, label: '21', color: '#E83E8C' },
  { value: '?', label: '?', color: '#FFC107', isSpecial: true },
  { value: '☕', label: '☕', color: '#795548', isSpecial: true }
];

export const getDeck = (includeQuestionMark = true, includeCoffee = true) => {
  return FIBONACCI_DECK.filter(card => {
    if (card.value === '?' && !includeQuestionMark) return false;
    if (card.value === '☕' && !includeCoffee) return false;
    return true;
  });
};

export const getCardColor = (value) => {
  const card = FIBONACCI_DECK.find(c => c.value === value);
  return card?.color || '#6C757D';
};
