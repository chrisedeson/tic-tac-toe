// frontend/app/components/game/Board.tsx
import React from 'react';
import Cell from './Cell';
import { useGame } from '../../contexts/GameContext';
import { useSocket } from '../../contexts/SocketContext';
import { EVENTS } from '../../../../backend/src/socket/events'; // Adjust path

const Board: React.FC = () => {
  const { board, gameActive, winner, currentPlayer, gameId } = useGame(); // Get from GameContext
  const { socket } = useSocket();

  const handleCellClick = (index: number) => {
    if (!gameActive || board[index] || winner || !socket || !gameId) return;
    // Client-side validation: is it my turn? (CurrentPlayer might be 'X' or 'O', need to map to user)
    // The server should be the ultimate authority on whose turn it is.
    // For simplicity, we assume client knows current player symbol.

    socket.emit(EVENTS.GAME_MOVE_MAKE, { gameId, cellIndex: index, player: currentPlayer });
    // Optimistic update can be done here, or wait for server confirmation via GAME_STATE_UPDATE
  };

  if (!gameActive && !winner) {
    return <div className="text-center p-10 text-xl">Start a game or accept a challenge!</div>;
  }
  if (!gameActive && winner) {
    return <div className="text-center p-10 text-xl">Game Over! {winner === 'Draw' ? "It's a Draw!" : `${winner} wins!`}</div>;
  }


  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3 p-2 bg-white/10 dark:bg-black/20 rounded-lg shadow-lg max-w-sm w-full aspect-square mx-auto">
      {board.map((cellValue, index) => (
        <Cell
          key={index}
          value={cellValue}
          onClick={() => handleCellClick(index)}
          disabled={!gameActive || !!cellValue || !!winner}
        />
      ))}
    </div>
  );
};

export default Board;