import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types/game";
import {
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
  getActiveGame,
  getQuestionState,
  loadQuestionsForGame,
} from "./game-manager";

const adminCredentials = {
  email: (process.env.ADMIN_EMAIL || "admin@cyberquiz.local").toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "admin123",
};

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("admin:login", ({ email, password }, callback) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const isValid =
        normalizedEmail === adminCredentials.email &&
        password === adminCredentials.password;

      if (!isValid) {
        socket.emit("admin:login-result", {
          success: false,
          message: "Email ou mot de passe incorrect.",
        });
        callback({ success: false, message: "Email ou mot de passe incorrect." });
        return;
      }

      socket.data.isAdmin = true;
      socket.data.isHost = true;
      socket.emit("admin:login-result", {
        success: true,
        message: "Connexion administrateur réussie.",
      });
      callback({ success: true, message: "Connexion administrateur réussie." });
    });

    socket.on("player:join", async ({ code, nickname }, callback) => {
      try {
        const result = await joinGameAsPlayer(code, nickname, socket.id);

        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.data.playerId = result.playerId;
        socket.data.gameId = result.gameId;
        socket.data.nickname = nickname;
        socket.data.isHost = false;

        await socket.join(result.gameId);

        const game = getActiveGame(result.gameId);
        if (game) {
          const player = game.players.get(result.playerId);
          if (player) {
            socket.to(result.gameId).emit("game:player-joined", {
              id: player.id,
              nickname: player.nickname,
              score: player.score,
              streak: player.streak,
              maxStreak: player.maxStreak,
              correctCount: player.correctCount,
              isConnected: true,
            });
          }

          const state = getGameState(result.gameId);
          if (state) {
            socket.emit("game:state", state);
          }
        }

        callback({ success: true, playerId: result.playerId });
      } catch (error) {
        console.error("[Socket] player:join error:", error);
        callback({ success: false, error: "Erreur serveur." });
      }
    });

    socket.on("player:answer", async ({ questionId, optionId }) => {
      const { playerId, gameId } = socket.data;
      if (!playerId || !gameId) return;

      await submitAnswer(gameId, playerId, questionId, optionId);
    });

    socket.on("host:create-game", async (settings, callback) => {
      try {
        if (!socket.data.isAdmin) {
          callback({ success: false, error: "Connectez-vous en tant qu'administrateur." });
          return;
        }

        const { gameId, code } = await createGame(settings, socket.id);

        socket.data.gameId = gameId;
        socket.data.isHost = true;

        await socket.join(gameId);
        await loadQuestionsForGame(gameId);

        const state = getGameState(gameId);
        if (state) {
          socket.emit("game:state", state);
        }

        callback({ success: true, code, gameId });
      } catch (error) {
        console.error("[Socket] host:create-game error:", error);
        callback({ success: false, error: "Impossible de créer la partie." });
      }
    });

    socket.on("host:join-game", async ({ code }, callback) => {
      try {
        if (!socket.data.isAdmin) {
          callback({ success: false, error: "Connectez-vous en tant qu'administrateur." });
          return;
        }

        const result = await joinGameAsHost(code, socket.id);

        if (!result) {
          callback({ success: false, error: "Partie introuvable." });
          return;
        }

        socket.data.gameId = result.gameId;
        socket.data.isHost = true;

        await socket.join(result.gameId);
        await loadQuestionsForGame(result.gameId);

        const state = getGameState(result.gameId);
        if (state) {
          socket.emit("game:state", state);
        }

        callback({ success: true, gameId: result.gameId, code: result.code });
      } catch (error) {
        console.error("[Socket] host:join-game error:", error);
        callback({ success: false, error: "Erreur serveur." });
      }
    });

    socket.on("host:kick-player", ({ playerId }) => {
      const { gameId, isHost } = socket.data;
      if (!gameId || !isHost) return;

      const game = getActiveGame(gameId);
      const player = game?.players.get(playerId);

      if (kickPlayer(gameId, playerId)) {
        io.to(gameId).emit("game:player-left", { playerId });

        if (player?.socketId) {
          io.to(player.socketId).emit("game:kicked");
        }
      }
    });

    socket.on("host:update-settings", (settings) => {
      const { gameId, isHost } = socket.data;
      if (!gameId || !isHost) return;

      if (updateGameSettings(gameId, settings)) {
        const state = getGameState(gameId);
        if (state) {
          io.to(gameId).emit("game:state", state);
        }
      }
    });

    socket.on("host:start-game", async () => {
      const { gameId, isHost } = socket.data;
      if (!gameId || !isHost) return;

      await startGameCountdown(
        gameId,
        (seconds) => {
          io.to(gameId).emit("game:countdown", { seconds });
        },
        async () => {
          const question = await startQuestion(
            gameId,
            (timeRemaining) => {
              io.to(gameId).emit("game:timer-tick", { timeRemaining });
            },
            async () => {
              const reveal = await revealQuestion(gameId);
              if (reveal) {
                io.to(gameId).emit("game:question-reveal", reveal);

                setTimeout(() => {
                  const game = getActiveGame(gameId);
                  if (game) {
                    game.phase = "leaderboard";
                    const state = getGameState(gameId);
                    if (state) {
                      io.to(gameId).emit("game:leaderboard", {
                        entries: state.leaderboard || [],
                      });
                    }
                  }
                }, 5000);
              }
            }
          );

          if (question) {
            io.to(gameId).emit("game:question-start", {
              question,
              timeRemaining: getActiveGame(gameId)?.settings.questionTime || 20,
            });
          }
        }
      );
    });

    socket.on("host:next-question", async () => {
      const { gameId, isHost } = socket.data;
      if (!gameId || !isHost) return;

      const game = getActiveGame(gameId);
      if (!game) return;

      if (game.currentQuestionIndex >= game.questionIds.length - 1) {
        const result = await finishGame(gameId);
        if (result) {
          io.to(gameId).emit("game:finished", result);
        }
        return;
      }

      const question = await startQuestion(
        gameId,
        (timeRemaining) => {
          io.to(gameId).emit("game:timer-tick", { timeRemaining });
        },
        async () => {
          const reveal = await revealQuestion(gameId);
          if (reveal) {
            io.to(gameId).emit("game:question-reveal", reveal);

            setTimeout(() => {
              const g = getActiveGame(gameId);
              if (g) {
                g.phase = "leaderboard";
                const state = getGameState(gameId);
                if (state) {
                  io.to(gameId).emit("game:leaderboard", {
                    entries: state.leaderboard || [],
                  });
                }
              }
            }, 5000);
          }
        }
      );

      if (question) {
        io.to(gameId).emit("game:question-start", {
          question,
          timeRemaining: game.settings.questionTime,
        });
      }
    });

    socket.on("host:end-game", async () => {
      const { gameId, isHost } = socket.data;
      if (!gameId || !isHost) return;

      const result = await finishGame(gameId);
      if (result) {
        io.to(gameId).emit("game:finished", result);
      }
    });

    socket.on("disconnect", () => {
      const result = disconnectPlayer(socket.id);
      if (result) {
        socket.to(result.gameId).emit("game:player-left", {
          playerId: result.playerId,
        });
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
}