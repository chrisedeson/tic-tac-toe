// frontend/app/contexts/GameContext.tsx
// frontend/app/contexts/GameContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import type {
  BoardState,
  GameState,
  Opponent,
  PlayerSymbol,
  Score,
} from "../types";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { EVENTS } from "../../../backend/src/socket/events";

// Initial game state
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

// Context type
interface GameContextType extends GameState {
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  resetGame: () => void;
  makeMove: (index: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    // --- Game started ---
    const handleGameStart = (data: {
      gameID: string; // 👈 from backend (not camelCase)
      board: BoardState;
      playerSymbol: PlayerSymbol;
      currentPlayerId: string;
      opponent: Opponent;
    }) => {
      console.log("GAME_START received:", data);

      setGameState((prev) => ({
        ...prev,
        gameId: data.gameID, // ✅ Use correct key here
        board: data.board,
        playerSymbol: data.playerSymbol,
        currentPlayerId: data.currentPlayerId,
        opponent: data.opponent,
        gameActive: true,
        winner: null,
        timeLeft: 10,
      }));
    };

    // --- Game state update (after move) ---
    const handleGameStateUpdate = (data: {
      board: BoardState;
      currentPlayerId: string;
    }) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        currentPlayerId: data.currentPlayerId,
        timeLeft: 10,
      }));
    };

    // --- Timer update ---
    const handleTimerUpdate = (data: { timeLeft: number }) => {
      setGameState((prev) => ({
        ...prev,
        timeLeft: data.timeLeft,
      }));
    };

    // --- Game ended ---
    const handleGameEnd = (data: { winnerId: string; reason: string }) => {
      setGameState((prev) => {
        const updatedScores: Score =
          data.winnerId === "Draw"
            ? { ...prev.scores, draws: prev.scores.draws + 1 }
            : data.winnerId === user?.id
            ? { ...prev.scores, wins: prev.scores.wins + 1 }
            : { ...prev.scores, losses: prev.scores.losses + 1 };

        return {
          ...prev,
          gameActive: false,
          winner: data.winnerId,
          scores: updatedScores,
        };
      });
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
    setGameState((prev) => ({
      ...initialGameState,
      scores: { ...prev.scores },
    }));
  };

  const makeMove = (index: number) => {
    if (!socket || !gameState.gameActive || gameState.board[index] !== null)
      return;

    socket.emit(EVENTS.GAME_MOVE_MAKE, {
      gameId: gameState.gameId,
      cellIndex: index, // Make sure this matches backend
    });
  };

  return (
    <GameContext.Provider
      value={{ ...gameState, setGameState, resetGame, makeMove }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
