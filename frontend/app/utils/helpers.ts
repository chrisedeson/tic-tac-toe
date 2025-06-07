// frontend/src/utils/helpers.ts
// Example helper function
export const formatTimestamp = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};