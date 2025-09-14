import type { Player, GameState } from './types';

export const MOCK_CURRENT_USER_ID = 'user-1';

export const MOCK_WORD_LIST = [
    'Star', 'Mountain', 'House', 'Tree', 'Car', 'Sun', 'Moon', 'Cloud', 'Flower', 'Boat',
    'Bridge', 'Key', 'Book', 'Clock', 'Fish', 'Bird', 'Cat', 'Dog', 'Chair', 'Table'
];

const MOCK_PLAYERS: Player[] = [
  { id: 'user-1', name: 'You', score: 120, isDrawing: false, avatar: '/avatars/01.png' },
  { id: 'user-2', name: 'Alex', score: 95, isDrawing: true, avatar: '/avatars/02.png' },
  { id: 'user-3', name: 'Mia', score: 150, isDrawing: false, avatar: '/avatars/03.png' },
  { id: 'user-4', name: 'Leo', score: 80, isDrawing: false, avatar: '/avatars/04.png' },
];

export const MOCK_GAME_STATE: GameState = {
  players: MOCK_PLAYERS,
  messages: [
    { id: 'msg-1', playerId: 'user-3', playerName: 'Mia', text: 'Is it a planet?', type: 'guess' },
    { id: 'msg-2', playerId: 'user-4', playerName: 'Leo', text: 'A cookie?', type: 'guess' },
    { id: 'msg-3', text: 'Alex is drawing!', type: 'system' },
  ],
  currentWord: MOCK_WORD_LIST[0],
  turnEndsAt: Date.now() + 90000,
};
