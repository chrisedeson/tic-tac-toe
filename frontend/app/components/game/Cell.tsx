// frontend/app/components/game/Cell.tsx
import React from 'react';
import type { PlayerSymbol } from '../../types';
import { motion } from 'framer-motion';

interface CellProps {
  value: PlayerSymbol | null;
  onClick: () => void;
  disabled: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, disabled }) => {
  const symbolColor = value === 'X' ? 'text-green-400' : 'text-purple-400';
  const hoverClass = disabled ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
  
  return (
    <button
      onClick={() => {
        console.log('Cell clicked!');
        onClick();
      }}
      className={`aspect-square flex items-center justify-center text-4xl md:text-6xl font-bold border-2 rounded-lg transition-colors duration-200 ${hoverClass} ${ disabled ? 'cursor-not-allowed' : 'cursor-pointer'} border-gray-300 dark:border-gray-600`}
    >
      {value && (
        <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={symbolColor}
        >
          {value}
        </motion.span>
      )}
    </button>
  );
};

export default Cell;