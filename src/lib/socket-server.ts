import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types/game";
import {
  getActiveGame,
  getActiveGameByCode,
  createGame,
  joinGameAsHost,
  joinGameAsPlayer,
  kickPlayer,
  updateGameSettings,
  startGameCountdown,
  startQuestion,
  submitAnswer,
  revealQuestion,
  getGameState,
  finishGame,
  disconnectPlayer,
} from "./game-manager";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function buildLeaderboardEntries(players: Iterable<{ id: string; nickname: string; score: number; correctCount: number; maxStreak: number }>) {
  return Array.from(players)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
      return a.nickname.localeCompare(b.nickname);
    })
    .map((p, index) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      rank: index + 1,
    }));
}

const adminSessions = new Map<string, { email: string; timestamp: number }>();
const socketToGameMap = new Map<string, { gameId: string; playerId?: string }>();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cyberlearn.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SecurePassword123!";

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket",
  });

  io.on("connection", (socket: GameSocket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Admin Login
    socket.on("admin:login", (data, callback) => {
      const isValid = data.email === ADMIN_EMAIL && data.password === ADMIN_PASSWORD;
      
      if (isValid) {
        adminSessions.set(socket.id, { email: data.email, timestamp: Date.now() });
        socket.data.isAdmin = true;
        callback({ success: true });
      } else {
        callback({ success: false, message: "Identifiants invalides" });
      }
    });

    // Host: Create Game
    socket.on("host:create-game", async (data, callback) => {
      if (!socket.data.isAdmin) {
        callback({ success: false, error: "Non autorisé" });
        return;
      }

      try {
        const result = await createGame(data, socket.id);
        socket.join(`game:${result.code}`);
        socketToGameMap.set(socket.id, { gameId: result.gameId });
        socket.data.gameId = result.gameId;
        socket.data.isHost = true;

        const gameState = getGameState(result.gameId);
        if (gameState) {
          socket.emit("game:state", gameState);
        }
        callback({ success: true, code: result.code, gameId: result.gameId });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // Host: Join Game
    socket.on("host:join-game", async (data, callback) => {
      if (!socket.data.isAdmin) {
        callback({ success: false, error: "Non autorisé" });
        return;
      }

      try {
        const game = getActiveGameByCode(data.code);
        if (!game) {
          callback({ success: false, error: "Partie non trouvée" });
          return;
        }

        const result = await joinGameAsHost(data.code, socket.id);
        if (!result) {
          callback({ success: false, error: "Impossible de rejoindre la partie" });
          return;
        }

        socket.join(`game:${data.code}`);
        socketToGameMap.set(socket.id, { gameId: result.gameId });
        socket.data.gameId = result.gameId;
        socket.data.isHost = true;

        const gameState = getGameState(result.gameId);
        if (gameState) {
          socket.emit("game:state", gameState);
        }
        callback({ success: true, code: data.code, gameId: result.gameId });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // Player: Join Game
    socket.on("player:join", async (data, callback) => {
      try {
        const game = getActiveGameByCode(data.code);
        if (!game) {
          callback({ success: false, error: "Code invalide" });
          return;
        }

        const existingMapping = socketToGameMap.get(socket.id);
        if (existingMapping && existingMapping.gameId === game.id) {
          const existingPlayerId = existingMapping.playerId;
          if (existingPlayerId) {
            socket.join(`game:${data.code}`);
            socket.data.gameId = existingMapping.gameId;
            socket.data.playerId = existingPlayerId;
            callback({ success: true, playerId: existingPlayerId, gameId: existingMapping.gameId });
            const gameState = getGameState(existingMapping.gameId);
            if (gameState) {
              io.to(`game:${data.code}`).emit("game:state", gameState);
            }
            return;
          }
        }

        const result = await joinGameAsPlayer(data.code, data.nickname, socket.id);
        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(`game:${data.code}`);
        socketToGameMap.set(socket.id, { gameId: result.gameId, playerId: result.playerId });
        socket.data.gameId = result.gameId;
        socket.data.playerId = result.playerId;

        callback({
          success: true,
          playerId: result.playerId,
          gameId: result.gameId,
        });

        const gameState = getGameState(result.gameId);
        if (gameState) {
          io.to(`game:${data.code}`).emit("game:state", gameState);
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // Player: Answer Question
    socket.on("player:answer", async (data) => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping) return;

      try {
        await submitAnswer(mapping.gameId, mapping.playerId!, data.questionId, data.optionId);
        const gameState = getGameState(mapping.gameId);
        const game = getActiveGame(mapping.gameId);
        if (gameState && game) {
          io.to(`game:${game.code}`).emit("game:state", gameState);
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
      }
    });

    // Host: Start Game
    socket.on("host:start-game", async () => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping || !socket.data.isHost) return;

      try {
        const game = getActiveGame(mapping.gameId);
        if (game) {
          const success = await startGameCountdown(
            mapping.gameId,
            (seconds) => {
              io.to(`game:${game.code}`).emit("game:countdown", { seconds });
            },
            async () => {
              const question = await startQuestion(
                mapping.gameId,
                (timeRemaining) => {
                  io.to(`game:${game.code}`).emit("game:timer-tick", { timeRemaining });
                },
                async () => {
                  try {
                    const reveal = await revealQuestion(mapping.gameId);
                    if (reveal) {
                      io.to(`game:${game.code}`).emit("game:question-reveal", reveal);
                      
                      // Show the correct answer first, then the leaderboard after 10 seconds.
                      const updatedGame = getActiveGame(mapping.gameId);
                      if (updatedGame) {
                        setTimeout(() => {
                          const leaderboard = buildLeaderboardEntries(updatedGame.players.values());
                          io.to(`game:${game.code}`).emit("game:leaderboard", { entries: leaderboard });
                        }, 10000);
                      }
                    }
                  } catch (error) {
                    console.error("Error in reveal question:", error);
                    io.to(`game:${game.code}`).emit("game:error", {
                      message: "Erreur lors de la révélation de la réponse",
                    });
                  }
                }
              );
              if (question) {
                io.to(`game:${game.code}`).emit("game:question-start", {
                  question,
                  timeRemaining: game.settings.questionTime,
                });
              }
            }
          );
          if (success) {
            const gameState = getGameState(mapping.gameId);
            if (gameState) {
              io.to(`game:${game.code}`).emit("game:state", gameState);
            }
          }
        }
      } catch (error) {
        console.error("Error starting game:", error);
      }
    });

    // Host: Update Settings
    socket.on("host:update-settings", (data) => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping || !socket.data.isHost) return;

      updateGameSettings(mapping.gameId, data);
      const gameState = getGameState(mapping.gameId);
      const game = getActiveGame(mapping.gameId);
      if (gameState && game) {
        io.to(`game:${game.code}`).emit("game:state", gameState);
      }
    });

    // Host: Next Question
    socket.on("host:next-question", async () => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping || !socket.data.isHost) return;

      try {
        const game = getActiveGame(mapping.gameId);
        if (!game) return;

        if (game.currentQuestionIndex + 1 < game.questionIds.length) {
          const question = await startQuestion(
            mapping.gameId,
            (timeRemaining) => {
              io.to(`game:${game.code}`).emit("game:timer-tick", { timeRemaining });
            },
            async () => {
              try {
                const reveal = await revealQuestion(mapping.gameId);
                if (reveal) {
                  io.to(`game:${game.code}`).emit("game:question-reveal", reveal);
                  
                  // Show the correct answer first, then the leaderboard after 10 seconds.
                  const updatedGame = getActiveGame(mapping.gameId);
                  if (updatedGame) {
                    setTimeout(() => {
                      const leaderboard = buildLeaderboardEntries(updatedGame.players.values());
                      io.to(`game:${game.code}`).emit("game:leaderboard", { entries: leaderboard });
                    }, 10000);
                  }
                }
              } catch (error) {
                console.error("Error in reveal question:", error);
                io.to(`game:${game.code}`).emit("game:error", {
                  message: "Erreur lors de la révélation de la réponse",
                });
              }
            }
          );
          if (question) {
            io.to(`game:${game.code}`).emit("game:question-start", {
              question,
              timeRemaining: game.settings.questionTime,
            });
          }
        } else {
          // All questions answered - show leaderboard
          const leaderboard = Array.from(game.players.values())
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
              if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
              return a.nickname.localeCompare(b.nickname);
            })
            .map((p, index) => ({
              id: p.id,
              nickname: p.nickname,
              score: p.score,
              rank: index + 1,
            }));
          io.to(`game:${game.code}`).emit("game:leaderboard", { entries: leaderboard });
        }
      } catch (error) {
        console.error("Error starting next question:", error);
      }
    });

    // Host: End Game
    socket.on("host:end-game", async () => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping || !socket.data.isHost) return;

      try {
        const game = getActiveGame(mapping.gameId);
        if (!game) return;

        const result = await finishGame(mapping.gameId);
        if (result) {
          io.to(`game:${game.code}`).emit("game:finished", result);
          io.to(`game:${game.code}`).disconnectSockets();
        }
      } catch (error) {
        console.error("Error finishing game:", error);
      }
    });

    // Host: Kick Player
    socket.on("host:kick-player", (data) => {
      const mapping = socketToGameMap.get(socket.id);
      if (!mapping || !socket.data.isHost) return;

      const game = getActiveGame(mapping.gameId);
      if (!game) return;

      const kickedPlayer = game.players.get(data.playerId);
      const kickedSocketId = kickedPlayer?.socketId ?? null;

      if (kickPlayer(mapping.gameId, data.playerId)) {
        for (const [questionId, answers] of game.answers.entries()) {
          answers.delete(data.playerId);
          if (answers.size === 0) {
            game.answers.delete(questionId);
          }
        }

        const gameState = getGameState(mapping.gameId);
        if (gameState) {
          io.to(`game:${game.code}`).emit("game:state", gameState);
        }

        if (kickedSocketId) {
          const kickedSocket = io.sockets.sockets.get(kickedSocketId);
          if (kickedSocket) {
            kickedSocket.leave(`game:${game.code}`);
            kickedSocket.emit("game:kicked");
          }
          socketToGameMap.delete(kickedSocketId);
        }
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);

      const mapping = socketToGameMap.get(socket.id);
      if (mapping) {
        const game = getActiveGame(mapping.gameId);
        if (game) {
          if (socket.data.isHost) {
            // A host refresh/reconnect should not instantly kill an active game.
            // Keep the game running until it is explicitly finished by the host.
            if (game.hostSocketId === socket.id) {
              game.hostSocketId = null;
            }
            const gameState = getGameState(mapping.gameId);
            if (gameState) {
              io.to(`game:${game.code}`).emit("game:state", gameState);
            }
          } else if (mapping.playerId) {
            // Player disconnected: keep their slot, mark as offline, and allow reconnection.
            disconnectPlayer(socket.id);
            const gameState = getGameState(mapping.gameId);
            if (gameState) {
              io.to(`game:${game.code}`).emit("game:state", gameState);
            }
          }
        }
        socketToGameMap.delete(socket.id);
      }

      // Clean up admin session
      adminSessions.delete(socket.id);
    });
  });

  return io;
}
