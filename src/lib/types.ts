export interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  avatar: string;
}

export interface Message {
  id: string;
  playerId?: string;
  playerName?: string;
  text: string;
  type: 'guess' | 'system' | 'hint';
}

export interface GameState {
  players: Player[];
  messages: Message[];
  currentWord: string;
  turnEndsAt: number;
}

export interface ToolSettings {
  color: string;
  brushSize: number;
}
