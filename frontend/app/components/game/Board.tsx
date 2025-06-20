// frontend/app/components/game/Board.tsx
import React from "react";
import Cell from "./Cell";
import { useGame } from "../../contexts/GameContext";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { EVENTS } from "../../../../backend/src/socket/events";

const Board: React.FC = () => {
  const {
    board,
    gameActive,
    winner,
    currentPlayerId,
    playerSymbol,
    gameId,
    opponent,
  } = useGame();

  const { user } = useAuth();
  const { socket } = useSocket();

  const isMyTurn = user?.userID === currentPlayerId;

  const handleCellClick = (index: number) => {
    if (
      !gameActive ||
      board[index] ||
      winner ||
      !socket ||
      !gameId ||
      !isMyTurn
    )
      return;

    socket.emit(EVENTS.GAME_MOVE_MAKE, {
      gameId,
      cellIndex: index,
    });
  };

  let winnerMessage = "";
  if (!gameActive && winner) {
    if (winner === "Draw") {
      winnerMessage = "It's a Draw!";
    } else if (winner === user?.userID) {
      winnerMessage = "You win!";
    } else if (winner === opponent?.userId) {
      winnerMessage = `${opponent.username} wins!`;
    } else {
      winnerMessage = `${winner} wins!`; // fallback
    }
  }

  if (!gameActive && !winner) {
    return (
      <div className="text-center p-10 text-xl">
        Start a game or accept a challenge!
      </div>
    );
  }

  if (!gameActive && winner) {
    return (
      <div className="text-center p-10 text-xl">Game Over! {winnerMessage}</div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3 p-2 bg-white/10 dark:bg-black/20 rounded-lg shadow-lg max-w-sm w-full aspect-square mx-auto">
      {board.map((cellValue, index) => (
        <Cell
          key={index}
          value={cellValue}
          onClick={() => handleCellClick(index)}
          disabled={!gameActive || !!cellValue || !!winner || !isMyTurn}
        />
      ))}
    </div>
  );
};

export default Board;
