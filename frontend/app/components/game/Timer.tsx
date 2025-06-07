// frontend/app/components/game/Timer.tsx
import React from "react";
import type { TimerProps } from "~/types";
import { useAuth } from "../../contexts/AuthContext";

const Timer: React.FC<TimerProps> = ({ timeLeft, currentPlayerId }) => {
  const { user } = useAuth();
  const isMyTurn = user?.userID === currentPlayerId;
  const timeColor = timeLeft <= 3 ? "text-red-500" : "";
  const turnText = isMyTurn ? "Your Turn" : "Opponent's Turn";

  return (
    <div className="w-full p-2 bg-white/5 dark:bg-black/20 rounded-lg flex justify-between items-center text-center">
      <span className="font-semibold">{turnText}</span>
      <span className={`text-2xl font-mono font-bold ${timeColor}`}>
        {timeLeft}s
      </span>
    </div>
  );
};

export default Timer;
