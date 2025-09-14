import { FieldValue, Timestamp } from "firebase/firestore";

export interface Player {
  id: string;
  name: string;
  score: number;
  avatar: string;
  isHost?: boolean;
  joinedAt?: Timestamp | FieldValue;
}

export interface Message {
  id: string;
  playerId?: string;
  playerName?: string;
  text: string;
  type: 'guess' | 'system' | 'hint' | 'correct';
  timestamp?: FieldValue;
}

export interface Game {
    status: 'playing' | 'ended' | 'waiting';
    currentWord: string;
    currentDrawerId: string;
    round: number;
    turnEndsAt: Timestamp | FieldValue;
    correctGuessers: string[];
}

export interface ToolSettings {
  color: string;
  brushSize: number;
}

export interface DrawingPoint {
    type: 'start' | 'draw' | 'end' | 'clear';
    coords?: { x: number; y: number };
    settings?: ToolSettings;
    timestamp?: FieldValue;
}

// Deprecated, use Game instead
export interface GameState {
  players: Player[];
  messages: Message[];
  currentWord: string;
  turnEndsAt: number;
}

    