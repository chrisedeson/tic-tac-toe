// frontend/app/components/game/GameEndModal.tsx
import React from "react";
import { useGame } from "../../contexts/GameContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import Confetti from "react-confetti"; // Import the Confetti component

const GameEndModal: React.FC = () => {
  const { winner, opponent, resetGame } = useGame();
  const { user } = useAuth();

  if (!winner) return null;

  const handleRematch = () => {
    // This should emit a rematch request to the opponent
    console.log("Rematch requested with", opponent?.userId);
    resetGame(); // For now, just reset locally.
  };

  const handleClose = () => {
    resetGame();
  };

  let title = "";
  if (winner === "Draw") {
    title = "It's a Draw!";
  } else if (winner === user?.userID) {
    title = "🎉 You Won! 🎉";
  } else {
    title = "Better Luck Next Time!";
  }

  return (
    <div>
      {/* Confetti trigger for the winner */}
      {winner === user?.userID && <Confetti />}

      <Dialog open={!!winner} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
            <DialogDescription className="text-center">
              The game against {opponent?.username || "your opponent"} has
              concluded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={handleClose}>
              Go to Lobby
            </Button>
            <Button
              onClick={handleRematch}
              disabled
              // disabled={opponent?.userId === "christopher"}
            >
              Request Rematch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default GameEndModal;