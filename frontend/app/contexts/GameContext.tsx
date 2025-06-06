// frontend/app/contexts/GameContext.tsx
import React, { createContext, useContext, useState, useEffect  } from 'react';
import type { ReactNode } from 'react'
import type { BoardState, GameState, Score } from '../types';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { EVENTS } from '../../../backend/src/socket/events'; // Adjust path

const initialGameState: GameState = {
  gameId: null,
  board: Array(9).fill(null),
  playerSymbol: null,
  currentPlayerId: null,
  opponent: null,
  gameActive: false,
  winner: null,
  scores: { wins: 0, losses: 0, draws: 0 },
  timeLeft: 10,
};

interface GameContextType extends GameState {
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !isConnected || !user) return;
    
    const handleGameStart = (data: any) => {
        setGameState(prev => ({
            ...prev,
            gameId: data.gameId,
            board: data.board,
            playerSymbol: data.playerSymbol,
            currentPlayerId: data.currentPlayerId,
            opponent: data.opponent,
            gameActive: true,
            winner: null,
        }));
    };

    const handleGameStateUpdate = (data: { board: BoardState; currentPlayerId: string; }) => {
        setGameState(prev => ({
            ...prev,
            board: data.board,
            currentPlayerId: data.currentPlayerId,
            timeLeft: 10, // Reset timer on state update
        }));
    };
    
    const handleTimerUpdate = (data: { timeLeft: number; currentPlayerId: string; }) => {
        setGameState(prev => ({ ...prev, timeLeft: data.timeLeft, currentPlayerId: data.currentPlayerId }));
    };

    const handleGameEnd = (data: { winnerId: string; reason: string }) => {
      setGameState(prev => ({
        ...prev,
        gameActive: false,
        winner: data.winnerId,
        scores:
          data.winnerId === 'Draw'
            ? { ...prev.scores, draws: prev.scores.draws + 1 }
            : data.winnerId === user.id
            ? { ...prev.scores, wins: prev.scores.wins + 1 }
            : { ...prev.scores, losses: prev.scores.losses + 1 },
      }));
    };
    
    socket.on(EVENTS.GAME_START, handleGameStart);
    socket.on(EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
    socket.on(EVENTS.GAME_TIMER_UPDATE, handleTimerUpdate);
    socket.on(EVENTS.GAME_END, handleGameEnd);

    return () => {
      socket.off(EVENTS.GAME_START, handleGameStart);
      socket.off(EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
      socket.off(EVENTS.GAME_TIMER_UPDATE, handleTimerUpdate);
      socket.off(EVENTS.GAME_END, handleGameEnd);
    };
  }, [socket, isConnected, user]);

  const resetGame = () => {
    setGameState(prev => ({
        ...initialGameState,
        scores: prev.scores // Keep scores between games
    }));
  };
  
  return (
    <GameContext.Provider value={{ ...gameState, setGameState, resetGame }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};