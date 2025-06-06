// frontend/app/components/game/Scoreboard.tsx
import React from 'react';
import type { Score } from '../../types';

interface ScoreboardProps {
  scores: Score;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ scores }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 border-b pb-2 dark:border-gray-700">Scoreboard</h2>
      <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
        <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Wins</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{scores.wins}</p>
        </div>
        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Losses</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{scores.losses}</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Draws</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.draws}</p>
        </div>
      </div>
    </div>
  );
};
export default Scoreboard;