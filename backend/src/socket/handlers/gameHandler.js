// backend/src/socket/handlers/gameHandler.js
const { v4: uuidv4 } = require('uuid');
const { EVENTS } = require('../events');
const gameService = require('../../services/gameService');
const { updateGameStatus } = require('../../controllers/userController');
const { getDB } = require('../../config/db');

const activeGames = new Map();

// ---------------------- Update Game in DB ----------------------
const updateGameInDB = async (gameId, updateData) => {
  console.log('[MongoDB] updateGameInDB called with:', { gameId, updateData });
  if (!gameId) {
    console.error('[MongoDB] Missing gameId');
    return null;
  }

  const setFields = {};
  for (const key in updateData) {
    if (key === 'gameID') continue; // never overwrite the id
    if (updateData[key] === undefined) continue;
    setFields[key] = updateData[key];
  }

  if (Object.keys(setFields).length === 0) {
    console.warn('[MongoDB] No updatable fields found in updateData:', updateData);
    return null;
  }

  try {
    const updated = await getDB()
      .collection('games')
      .findOneAndUpdate(
        { _id: gameId },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    console.log('[MongoDB] Update successful:', updated);
    return updated;
  } catch (error) {
    console.error(`[MongoDB] Failed to update game ${gameId}:`, error);
    return null;
  }
};

// ---------------------- Create New Game ----------------------
const createNewGame = async ({ player1, player2 }) => {
  const gameID = uuidv4();
  const userID = player1.userId;

  const game = {
    gameID,
    userID,
    playerX: player1,
    playerO: player2,
    board: Array(9).fill(null),
    currentPlayerId: player1.userId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await getDB().collection('games').insertOne({ _id: gameID, ...game });

  activeGames.set(gameID, { ...game, moveTimer: null });

  return game;
};

// ---------------------- Start Game ----------------------
const startGame = (io, game) => {
  const payload = {
    gameID: game.gameID,
    board: game.board,
    currentPlayerId: game.currentPlayerId,
    scores: { wins: 0, losses: 0, draws: 0 },
    opponent: {
      userId: game.playerO.userId,
      username: game.playerO.username,
    },
    playerSymbol: 'X',
  };

  io.to(game.playerX.socketId).emit(EVENTS.GAME_START, payload);

  if (game.playerO.userId !== 'christopher') {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_START, {
      ...payload,
      opponent: {
        userId: game.playerX.userId,
        username: game.playerX.username,
      },
      playerSymbol: 'O',
    });
  }
};

// ---------------------- Move Timer ----------------------
const startMoveTimer = (io, gameID) => {
  const game = activeGames.get(gameID);
  if (!game || game.status !== 'active') return;

  if (game.moveTimer) {
    clearInterval(game.moveTimer);
    game.moveTimer = null;
  }

  let timeLeft = 10;

  const emitTime = () => {
    io.to(game.playerX.socketId).emit(EVENTS.GAME_TIMER_UPDATE, {
      timeLeft,
      currentPlayerId: game.currentPlayerId,
    });
    if (game.playerO.socketId) {
      io.to(game.playerO.socketId).emit(EVENTS.GAME_TIMER_UPDATE, {
        timeLeft,
        currentPlayerId: game.currentPlayerId,
      });
    }
  };

  emitTime();

  game.moveTimer = setInterval(() => {
    timeLeft--;
    emitTime();

    if (timeLeft <= 0) {
      clearInterval(game.moveTimer);
      game.moveTimer = null;

      const winnerId =
        game.currentPlayerId === game.playerX.userId
          ? game.playerO.userId
          : game.playerX.userId;

      endGame(io, gameID, winnerId, 'timeout');
    }
  }, 1000);

  activeGames.set(gameID, game);
};

// ---------------------- End Game ----------------------
const endGame = async (io, gameID, winnerId, reason = 'win') => {
  const game = activeGames.get(gameID);
  if (!game || game.status === 'completed') return;

  if (game.moveTimer) {
    clearInterval(game.moveTimer);
    game.moveTimer = null;
  }

  // Notify both players about the game result
  io.to(game.playerX.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  if (game.playerO.socketId) {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  }

  // Reset gameStatus back to offline for both players
  await updateGameStatus(game.playerX.userId, 'offline');
  if (game.playerO.userId !== 'christopher') {
    await updateGameStatus(game.playerO.userId, 'offline');
  }

  // Update the game record in the database
  await updateGameInDB(gameID, {
    userID: game.userID,
    status: 'completed',
    winner: winnerId,
    updatedAt: new Date().toISOString(),
  });

  // Update wins, losses, and draws for a player
  const updatePlayerStats = async (userId, result) => {
    // Skip the AI so we never touch a DB record for 'christopher'
    if (userId === 'christopher') return;

    try {
      await getDB()
        .collection('users')
        .updateOne(
          { _id: userId },
          {
            $inc: {
              wins: result === 'win' ? 1 : 0,
              losses: result === 'loss' ? 1 : 0,
              draws: result === 'draw' ? 1 : 0,
            },
          }
        );
      console.log(`Player ${userId} stats updated: ${result}`);
    } catch (error) {
      console.error(`Failed to update player ${userId} stats:`, error);
    }
  };

  // Determine the results and update stats for both players
  if (winnerId === 'Draw') {
    await updatePlayerStats(game.playerX.userId, 'draw');
    await updatePlayerStats(game.playerO.userId, 'draw');
  } else {
    const loserId =
      winnerId === game.playerX.userId
        ? game.playerO.userId
        : game.playerX.userId;
    await updatePlayerStats(winnerId, 'win');
    await updatePlayerStats(loserId, 'loss');
  }

  activeGames.delete(gameID);
};

// ---------------------- Game Handler Initialization ----------------------
module.exports.initGameHandler = (io, socket, onlineUsers) => {
  socket.on(EVENTS.CHALLENGE_SEND, ({ toUserId }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (fromUser && toUser) {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RECEIVE, { fromUser });
    }
  });

  socket.on(EVENTS.CHALLENGE_RESPONSE, async ({ toUserId, accepted }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (!fromUser || !toUser) return;

    if (accepted) {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, {
        message: `${fromUser.username} accepted your challenge! Starting game...`,
      });

      const game = await createNewGame({ player1: toUser, player2: fromUser });

      // mark both players as playing
      await updateGameStatus(toUser.userId, 'playing');
      await updateGameStatus(fromUser.userId, 'playing');
      startGame(io, game);
      startMoveTimer(io, game.gameID);
    } else {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, {
        message: `${fromUser.username} declined your challenge.`,
      });
    }
  });

  socket.on(EVENTS.CHALLENGE_CHRISTOPHER, async () => {
    const fromUser = onlineUsers.get(socket.id);
    if (!fromUser) return;

    // mark the human as playing
    await updateGameStatus(fromUser.userId, 'playing');

    const christopher = {
      userId: 'christopher',
      username: 'Christopher',
      socketId: null,
    };
    const game = await createNewGame({
      player1: fromUser,
      player2: christopher,
    });

    startGame(io, game);
    startMoveTimer(io, game.gameID);
  });

  socket.on(EVENTS.GAME_MOVE_MAKE, async ({ gameId, cellIndex }) => {
    console.log(
      `[MOVE_MAKE] From ${socket.id}: gameId=${gameId}, cellIndex=${cellIndex}`
    );
    const game = activeGames.get(gameId);
    const player = onlineUsers.get(socket.id);

    if (
      !game ||
      !player ||
      !player.userId ||
      player.userId !== game.currentPlayerId
    )
      return;

    const symbol = player.userId === game.playerX.userId ? 'X' : 'O';
    game.board[cellIndex] = symbol;
    game.currentPlayerId =
      symbol === 'X' ? game.playerO.userId : game.playerX.userId;
    game.updatedAt = new Date().toISOString();

    if (game.moveTimer) {
      clearInterval(game.moveTimer);
      game.moveTimer = null;
    }

    const winnerSymbol = gameService.calculateWinner(game.board);
    if (winnerSymbol) {
      const winnerId =
        winnerSymbol === 'X' ? game.playerX.userId : game.playerO.userId;
      return endGame(io, gameId, winnerId);
    }

    if (gameService.isDraw(game.board)) {
      return endGame(io, gameId, 'Draw', 'draw');
    }

    io.to(game.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
      board: game.board,
      currentPlayerId: game.currentPlayerId,
    });
    if (game.playerO.socketId) {
      io.to(game.playerO.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
        board: game.board,
        currentPlayerId: game.currentPlayerId,
      });
    }

    if (game.currentPlayerId === 'christopher') {
      setTimeout(() => {
        const latestGame = activeGames.get(gameId);
        if (!latestGame || latestGame.status !== 'active') return;

        const aiMove = gameService.getChristopherMove(latestGame.board);
        latestGame.board[aiMove] = 'O';
        latestGame.currentPlayerId = latestGame.playerX.userId;
        latestGame.updatedAt = new Date().toISOString();

        const aiWinner = gameService.calculateWinner(latestGame.board);
        if (aiWinner) return endGame(io, gameId, 'christopher');
        if (gameService.isDraw(latestGame.board))
          return endGame(io, gameId, 'Draw', 'draw');

        io.to(latestGame.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
          board: latestGame.board,
          currentPlayerId: latestGame.currentPlayerId,
        });

        startMoveTimer(io, gameId);
        activeGames.set(gameId, latestGame);
      }, 1000);
    } else {
      startMoveTimer(io, gameId);
    }

    activeGames.set(gameId, game);
  });
};
