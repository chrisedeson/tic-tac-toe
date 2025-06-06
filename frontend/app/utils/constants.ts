// frontend/src/utils/constants.ts
export const AWS_COLORS = {
  green: '#1ED2A5',
  blue: '#00A1C9',
  purple: '#B635D9',
  pink: '#FF4F8B',
};

export const PLAYER_SYMBOLS = {
  X: 'X',
  O: 'O',
};

// frontend/src/utils/helpers.ts
// Example helper function
export const formatTimestamp = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};