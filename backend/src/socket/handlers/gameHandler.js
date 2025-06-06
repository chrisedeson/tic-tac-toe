// backend/src/socket/handlers/gameHandler.js
const { v4: uuidv4 } = require('uuid');
const { EVENTS } = require('../events');
const gameService = require('../../services/gameService');
const { docClient } = require('../../config/db');
const config = require('../../config');
const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// In-memory store for active games and timers.
// For production, consider a more robust solution like Redis.
const activeGames = new Map();

const updateGameInDB = async (gameId, updateData) => {
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const key in updateData) {
        const attrKey = `#${key}`;
        const attrValue = `:${key}`;
        updateExpressionParts.push(`${attrKey} = ${attrValue}`);
        expressionAttributeNames[attrKey] = key;
        expressionAttributeValues[attrValue] = updateData[key];
    }
    
    const params = {
        TableName: config.aws.gamesTable,
        Key: { gameID: gameId },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    };

    try {
        const { Attributes } = await docClient.send(new UpdateCommand(params));
        return Attributes;
    } catch (error) {
        console.error(`Failed to update game ${gameId}:`, error);
        return null;
    }
};

module.exports.initGameHandler = (io, socket, onlineUsers) => {

    const createNewGame = async ({ player1, player2 }) => {
        const gameId = uuidv4();
        const game = {
            gameId,
            playerX: player1, // { userId, username, socketId }
            playerO: player2,
            board: Array(9).fill(null),
            currentPlayerId: player1.userId, // Player X starts
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Save to DB
        await docClient.send(new PutCommand({ TableName: config.aws.gamesTable, Item: game }));
        activeGames.set(gameId, { ...game, moveTimer: null });

        return game;
    };

    const startGame = (game) => {
        const gameDataForClient = {
            gameId: game.gameId,
            board: game.board,
            scores: { wins: 0, losses: 0, draws: 0 }, // Should fetch from user profiles
            opponent: null, // This would be populated for each client
            playerSymbol: '',
            currentPlayerId: game.currentPlayerId,
        };
        
        // Send to Player X
        io.to(game.playerX.socketId).emit(EVENTS.GAME_START, {
            ...gameDataForClient,
            opponent: { userId: game.playerO.userId, username: game.playerO.username },
            playerSymbol: 'X',
        });
        
        // Send to Player O
        if (game.playerO.userId !== 'christopher') {
             io.to(game.playerO.socketId).emit(EVENTS.GAME_START, {
                ...gameDataForClient,
                opponent: { userId: game.playerX.userId, username: game.playerX.username },
                playerSymbol: 'O',
            });
        }
       
        startMoveTimer(game.gameId);
    };

    const startMoveTimer = (gameId) => {
        const game = activeGames.get(gameId);
        if (!game || game.status !== 'active') return;

        if (game.moveTimer) clearInterval(game.moveTimer);
        
        let timeLeft = 10;
        io.to(game.playerX.socketId).to(game.playerO.socketId).emit(EVENTS.GAME_TIMER_UPDATE, { timeLeft, currentPlayerId: game.currentPlayerId });
        
        game.moveTimer = setInterval(async () => {
            timeLeft--;
            io.to(game.playerX.socketId).to(game.playerO.socketId).emit(EVENTS.GAME_TIMER_UPDATE, { timeLeft, currentPlayerId: game.currentPlayerId });
            
            if (timeLeft <= 0) {
                clearInterval(game.moveTimer);
                const winnerId = game.currentPlayerId === game.playerX.userId ? game.playerO.userId : game.playerX.userId;
                const loserId = game.currentPlayerId;
                endGame(gameId, winnerId, "timeout");
            }
        }, 1000);
        activeGames.set(gameId, game);
    };
    
    const endGame = async (gameId, winnerId, reason = "win") => {
        const game = activeGames.get(gameId);
        if (!game || game.status === 'completed') return;
        
        if (game.moveTimer) clearInterval(game.moveTimer);
        
        const gameResult = {
            winnerId,
            reason, // "win", "draw", "timeout"
        };
        
        io.to(game.playerX.socketId).to(game.playerO.socketId).emit(EVENTS.GAME_END, gameResult);
        
        await updateGameInDB(gameId, { status: 'completed', winner: winnerId || "Draw", updatedAt: new Date().toISOString() });
        
        // TODO: Update user scores in the Users table
        
        activeGames.delete(gameId);
    };

    socket.on(EVENTS.CHALLENGE_SEND, ({ toUserId }) => {
        const fromUser = onlineUsers.get(socket.id);
        const toUser = [...onlineUsers.values()].find(u => u.userId === toUserId);
        
        if (toUser && fromUser) {
            io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RECEIVE, { fromUser });
        }
    });

    socket.on(EVENTS.CHALLENGE_CHRISTOPHER, async () => {
        const fromUser = onlineUsers.get(socket.id);
        if (!fromUser) return;
        
        const christopher = { userId: 'christopher', username: 'Christopher', socketId: null };
        const game = await createNewGame({ player1: fromUser, player2: christopher });
        startGame(game);
    });

    socket.on(EVENTS.CHALLENGE_RESPONSE, async ({ toUserId, accepted }) => {
        const fromUser = onlineUsers.get(socket.id); // The one who responded
        const toUser = [...onlineUsers.values()].find(u => u.userId === toUserId); // The one who initiated

        if (fromUser && toUser) {
            if (accepted) {
                io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, { message: `${fromUser.username} accepted your challenge! Starting game...` });
                const game = await createNewGame({ player1: toUser, player2: fromUser });
                startGame(game);
            } else {
                io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, { message: `${fromUser.username} declined your challenge.` });
            }
        }
    });

    socket.on(EVENTS.GAME_MOVE_MAKE, async ({ gameId, cellIndex }) => {
        const game = activeGames.get(gameId);
        const player = onlineUsers.get(socket.id);
        
        // Basic validation
        if (!game || !player || player.userId !== game.currentPlayerId || game.board[cellIndex] !== null) {
            // Can emit an error back to the player
            return;
        }

        // Apply move
        const playerSymbol = player.userId === game.playerX.userId ? 'X' : 'O';
        game.board[cellIndex] = playerSymbol;
        game.currentPlayerId = playerSymbol === 'X' ? game.playerO.userId : game.playerX.userId;
        game.updatedAt = new Date().toISOString();

        if (game.moveTimer) clearInterval(game.moveTimer);
        activeGames.set(gameId, game);

        const winnerSymbol = gameService.calculateWinner(game.board);
        if (winnerSymbol) {
            const winnerId = winnerSymbol === 'X' ? game.playerX.userId : game.playerO.userId;
            endGame(gameId, winnerId);
            return;
        }
        if (gameService.isDraw(game.board)) {
            endGame(gameId, 'Draw', 'draw');
            return;
        }

        // Broadcast move to both players
        io.to(game.playerX.socketId).to(game.playerO.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
            board: game.board,
            currentPlayerId: game.currentPlayerId,
        });

        // If playing against Christopher, trigger his move
        if (game.currentPlayerId === 'christopher') {
            setTimeout(() => {
                const aiMoveIndex = gameService.getChristopherMove(game.board);
                game.board[aiMoveIndex] = 'O';
                game.currentPlayerId = game.playerX.userId;
                game.updatedAt = new Date().toISOString();

                const aiWinner = gameService.calculateWinner(game.board);
                 if (aiWinner) {
                    endGame(gameId, 'christopher');
                    return;
                }
                if (gameService.isDraw(game.board)) {
                    endGame(gameId, 'Draw', 'draw');
                    return;
                }
                
                io.to(game.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
                    board: game.board,
                    currentPlayerId: game.currentPlayerId,
                });
                startMoveTimer(gameId);
            }, 1000); // AI "thinks" for a second
        } else {
            startMoveTimer(gameId);
        }
    });
    
    // TODO: Implement Rematch logic similarly to challenge flow
};