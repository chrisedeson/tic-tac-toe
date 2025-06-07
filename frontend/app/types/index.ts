// frontend/app/types/index.ts

// **FIX**: Update the User interface to include score properties.
// This creates a single, consistent type for your user object across the app.
export interface User {
  id: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface OnlineUser {
  userId: string;
  username: string;
  lastSeen?: string;
}

export interface Score {
  wins: number;
  losses: number;
  draws: number;
}

export type PlayerSymbol = 'X' | 'O';
export type BoardState = (PlayerSymbol | null)[];

export interface Opponent {
  userId: string;
  username: string;
}

export interface GameState {
  gameId: string | null;
  board: BoardState;
  playerSymbol: PlayerSymbol | null; // My symbol
  currentPlayerId: string | null; // The ID of the user whose turn it is
  opponent: Opponent | null;
  gameActive: boolean;
  winner: string | null; // Can be userId, 'Draw', or 'Christopher'
  scores: Score;
  timeLeft: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  text: string;
  timestamp: string;
  channel: string;
  recipientId?: string;
}
