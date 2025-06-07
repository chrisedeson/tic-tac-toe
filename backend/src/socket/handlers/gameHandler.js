// backend/src/socket/handlers/gameHandler.js
const { v4: uuidv4 } = require("uuid");
const { EVENTS } = require("../events");
const gameService = require("../../services/gameService");
const { docClient } = require("../../config/db");
const config = require("../../config");
const {
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const activeGames = new Map();

// ---------------------- Update Game in DB ----------------------
const updateGameInDB = async (gameId, updateData) => {
  console.log('[DynamoDB] updateGameInDB called with:', { gameId, updateData });
  if (!gameId) {
    console.error('[DynamoDB] Missing gameId');
    return null;
  }

  // Remove userID from the Key, since it’s NOT a key attribute in the table
  const updateExpressionParts = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  for (const key in updateData) {
    if (key === "gameID") continue;  // skip gameID key
    const value = updateData[key];
    if (value === undefined) continue;

    const attrKey = `#${key}`;
    const attrValue = `:${key}`;
    updateExpressionParts.push(`${attrKey} = ${attrValue}`);
    expressionAttributeNames[attrKey] = key;
    expressionAttributeValues[attrValue] = value;
  }

  if (updateExpressionParts.length === 0) {
    console.warn('[DynamoDB] No updatable fields found in updateData:', updateData);
    return null;
  }

  const params = {
    TableName: config.aws.gamesTable,
    Key: { gameID: gameId },  // ONLY gameID here
    UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  console.log('[DynamoDB] UpdateCommand params:', JSON.stringify(params, null, 2));

  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    console.log('[DynamoDB] Update successful:', Attributes);
    return Attributes;
  } catch (error) {
    console.error(`[DynamoDB] Failed to update game ${gameId}:`, error);
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
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: config.aws.gamesTable,
      Item: game,
    })
  );

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
    playerSymbol: "X",
  };

  io.to(game.playerX.socketId).emit(EVENTS.GAME_START, payload);

  if (game.playerO.userId !== "christopher") {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_START, {
      ...payload,
      opponent: {
        userId: game.playerX.userId,
        username: game.playerX.username,
      },
      playerSymbol: "O",
    });
  }
};

// ---------------------- Move Timer ----------------------
const startMoveTimer = (io, gameID) => {
  const game = activeGames.get(gameID);
  if (!game || game.status !== "active") return;

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

      endGame(io, gameID, winnerId, "timeout");
    }
  }, 1000);

  activeGames.set(gameID, game);
};

// ---------------------- End Game ----------------------
const endGame = async (io, gameID, winnerId, reason = "win") => {
  const game = activeGames.get(gameID);
  if (!game || game.status === "completed") return;

  if (game.moveTimer) {
    clearInterval(game.moveTimer);
    game.moveTimer = null;
  }

  // Notify both players about the game result
  io.to(game.playerX.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  if (game.playerO.socketId) {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  }

  // Update the game status in the database
  await updateGameInDB(gameID, {
    userID: game.userID,
    status: "completed",
    winner: winnerId,
    updatedAt: new Date().toISOString(),
  });

  // Update wins, losses, and draws for both players
  const updatePlayerStats = async (userId, result) => {
  const userParams = {
    TableName: config.aws.usersTable,
    Key: { userID: userId },
    UpdateExpression: `
      SET 
        wins = if_not_exists(wins, :zero) + :wins,
        losses = if_not_exists(losses, :zero) + :losses,
        draws = if_not_exists(draws, :zero) + :draws
    `,
    ExpressionAttributeValues: {
      ':wins': result === 'win' ? 1 : 0,
      ':losses': result === 'loss' ? 1 : 0,
      ':draws': result === 'draw' ? 1 : 0,
      ':zero': 0  // Ensure the field gets initialized to 0 if it doesn't exist
    },
  };

  try {
    await docClient.send(new UpdateCommand(userParams));
    console.log(`Player ${userId} stats updated: ${result}`);
  } catch (error) {
    console.error(`Failed to update player ${userId} stats:`, error);
  }
};


  // Determine the results and update stats for both players
  if (winnerId === "Draw") {
    // If it's a draw, update both players
    await updatePlayerStats(game.playerX.userId, 'draw');
    await updatePlayerStats(game.playerO.userId, 'draw');
  } else {
    // If there is a winner, update winner and loser stats
    const loserId = winnerId === game.playerX.userId ? game.playerO.userId : game.playerX.userId;
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

    const christopher = {
      userId: "christopher",
      username: "Christopher",
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
    console.log(`[MOVE_MAKE] From ${socket.id}: gameId=${gameId}, cellIndex=${cellIndex}`);
    const game = activeGames.get(gameId);
    const player = onlineUsers.get(socket.id);

    if (
      !game ||
      !player ||
      !player.userId ||
      player.userId !== game.currentPlayerId
    )
      return;

    const symbol = player.userId === game.playerX.userId ? "X" : "O";
    game.board[cellIndex] = symbol;
    game.currentPlayerId =
      symbol === "X" ? game.playerO.userId : game.playerX.userId;
    game.updatedAt = new Date().toISOString();

    if (game.moveTimer) {
      clearInterval(game.moveTimer);
      game.moveTimer = null;
    }

    const winnerSymbol = gameService.calculateWinner(game.board);
    if (winnerSymbol) {
      const winnerId =
        winnerSymbol === "X" ? game.playerX.userId : game.playerO.userId;
      return endGame(io, gameId, winnerId);
    }

    if (gameService.isDraw(game.board)) {
      return endGame(io, gameId, "Draw", "draw");
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

    if (game.currentPlayerId === "christopher") {
      setTimeout(() => {
        const latestGame = activeGames.get(gameId);
        if (!latestGame || latestGame.status !== "active") return; // 💥 Guard to avoid acting on ended game

        const aiMove = gameService.getChristopherMove(latestGame.board);
        latestGame.board[aiMove] = "O";
        latestGame.currentPlayerId = latestGame.playerX.userId;
        latestGame.updatedAt = new Date().toISOString();

        const aiWinner = gameService.calculateWinner(latestGame.board);
        if (aiWinner) return endGame(io, gameId, "christopher");
        if (gameService.isDraw(latestGame.board))
          return endGame(io, gameId, "Draw", "draw");

        io.to(latestGame.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
          board: latestGame.board,
          currentPlayerId: latestGame.currentPlayerId,
        });

        startMoveTimer(io, gameId);
        activeGames.set(gameId, latestGame); // 👈 Remember to update activeGames
      }, 1000);
    }

    activeGames.set(gameId, game);
  });
};
