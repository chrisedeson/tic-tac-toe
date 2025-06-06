// backend/src/services/gameService.js

/**
 * Calculates the winner of a Tic-Tac-Toe game.
 * @param {Array<string|null>} board - An array of 9 representing the board.
 * @returns {string|null} 'X', 'O', or null if no winner.
 */
const calculateWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Returns 'X' or 'O'
    }
  }
  return null;
};

/**
 * Checks if the board is full, resulting in a draw.
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
const isDraw = (board) => {
  return !calculateWinner(board) && board.every(cell => cell !== null);
};


/**
 * Simple AI logic for Christopher.
 * @param {Array<string|null>} board - The current board state.
 * @returns {number} The index of the best move for 'O'.
 */
const getChristopherMove = (board) => {
    const aiPlayer = 'O';
    const humanPlayer = 'X';

    // 1. Check if AI can win in the next move
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            const newBoard = [...board];
            newBoard[i] = aiPlayer;
            if (calculateWinner(newBoard) === aiPlayer) {
                return i;
            }
        }
    }

    // 2. Check if human can win in the next move, and block them
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            const newBoard = [...board];
            newBoard[i] = humanPlayer;
            if (calculateWinner(newBoard) === humanPlayer) {
                return i;
            }
        }
    }

    // 3. Take the center if it's free
    if (board[4] === null) return 4;

    // 4. Take one of the corners if they are free
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => board[i] === null);
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // 5. Take any available side
    const sides = [1, 3, 5, 7];
    const availableSides = sides.filter(i => board[i] === null);
    if (availableSides.length > 0) {
        return availableSides[Math.floor(Math.random() * availableSides.length)];
    }
    
    // This part should not be reached if the board is not full
    return board.findIndex(cell => cell === null);
};


module.exports = {
  calculateWinner,
  isDraw,
  getChristopherMove,
};