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
import {
  sanitizeNickname,
  validateGameCode,
  socketRateLimiter,
} from "./security-utils";
import {
  validateAdminCredentials,
  createAdminToken,
} from "./secure-auth";

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: "/api/socket",
    cors: {
      // ✅ SECURITY: Only allow configured origin
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"], // ✅ SECURITY: Remove polling, use websocket only
    maxHttpBufferSize: 1e4, // ✅ SECURITY: Limit buffer to 10KB
    pingTimeout: 10000,
    pingInterval: 25000,
  });

  // ✅ SECURITY: Middleware for all socket connections
  io.use((socket, next) => {
    // Check origin
    const origin = socket.handshake.headers.origin;
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    if (origin && origin !== allowedOrigin) {
      console.warn(`[Security] Unauthorized origin: ${origin}`);
      return next(new Error("CORS policy violation"));
    }

    next();
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ✅ SECURITY: Initialize rate limiter for this socket
    const socketRateLimitKey = socket.id;

    // ✅ SECURITY: Set session timeout (30 minutes)
    const sessionTimeout = setTimeout(() => {
      socket.emit("error", "Session expired");
      socket.disconnect(true);
    }, 30 * 60 * 1000);

    socket.on("disconnect", () => {
      clearTimeout(sessionTimeout);
      const result = disconnectPlayer(socket.id);
      if (result) {
        socket.to(result.gameId).emit("game:player-left", {
          playerId: result.playerId,
        });
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });

    socket.on("admin:login", async ({ email, password }, callback) => {
      // ✅ SECURITY: Rate limiting on login attempts
      if (socketRateLimiter.isLimited(socketRateLimitKey + ":login")) {
        callback({
          success: false,
          message: "Trop de tentatives. Réessayez plus tard.",
        });
        return;
      }

      try {
        // ✅ SECURITY: Validate credentials with bcryptjs
        const result = await validateAdminCredentials(email || "", password || "");

        if (!result.valid) {
          console.warn(`[Auth] Failed login attempt for email: ${email}`);
          callback({
            success: false,
            message: result.message,
          });
          return;
        }

        // ✅ SECURITY: Create JWT token instead of storing plaintext in socket
        const token = await createAdminToken(email);

        socket.data.isAdmin = true;
        socket.data.isHost = true;
        socket.data.adminEmail = email;
        socket.data.adminToken = token;

        console.log(`[Auth] Admin login successful: ${email}`);
        callback({
          success: true,
          message: "Connexion administrateur réussie.",
          token,
        });
      } catch (error) {
        console.error("[Auth] Login error:", error);
        callback({
          success: false,
          message: "Erreur serveur.",
        });
      }
    });

    socket.on("player:join", async ({ code, nickname }, callback) => {
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        callback({
          success: false,
          error: "Trop de requêtes. Réessayez plus tard.",
        });
        return;
      }

      try {
        // ✅ SECURITY: Validate and sanitize inputs
        if (!code || !nickname) {
          callback({
            success: false,
            error: "Code et pseudo sont requis.",
          });
          return;
        }

        if (!validateGameCode(code.toUpperCase())) {
          callback({
            success: false,
            error: "Code de partie invalide.",
          });
          return;
        }

        const sanitizedNickname = sanitizeNickname(nickname);
        if (!sanitizedNickname) {
          callback({
            success: false,
            error:
              "Le pseudo est invalide. Utilisez des caractères alphanumériques.",
          });
          return;
        }

        const result = await joinGameAsPlayer(
          code.toUpperCase(),
          sanitizedNickname,
          socket.id
        );

        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.data.playerId = result.playerId;
        socket.data.gameId = result.gameId;
        socket.data.nickname = sanitizedNickname;
        socket.data.isHost = false;

        await socket.join(result.gameId);

        const game = getActiveGame(result.gameId);
        if (game) {
          const player = game.players.get(result.playerId);
          if (player) {
            socket.to(result.gameId).emit("game:player-joined", {
              id: player.id,
              nickname: player.nickname, // ✅ Already sanitized
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
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        return;
      }

      const { playerId, gameId } = socket.data;

      // ✅ SECURITY: Verify player belongs to this game
      if (!playerId || !gameId) {
        socket.emit("error", "Non authentifié");
        return;
      }

      const game = getActiveGame(gameId);
      if (!game) {
        socket.emit("error", "Partie invalide");
        return;
      }

      // ✅ SECURITY: Verify player exists in game
      const player = game.players.get(playerId);
      if (!player) {
        socket.emit("error", "Joueur non trouvé dans la partie");
        return;
      }

      // ✅ SECURITY: Validate input parameters
      if (!questionId || !optionId || typeof questionId !== "string" || typeof optionId !== "string") {
        return;
      }

      // ✅ SECURITY: Server-side answer verification (not in this file)
      await submitAnswer(gameId, playerId, questionId, optionId);
    });

    socket.on("host:create-game", async (settings, callback) => {
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        callback({ success: false, error: "Trop de requêtes." });
        return;
      }

      try {
        // ✅ SECURITY: Verify admin authentication
        if (!socket.data.isAdmin) {
          console.warn(`[Security] Unauthorized game creation attempt: ${socket.id}`);
          callback({
            success: false,
            error: "Authentification administrateur requise.",
          });
          return;
        }

        // ✅ SECURITY: Validate settings
        if (!settings || typeof settings !== "object") {
          callback({ success: false, error: "Paramètres invalides." });
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
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        callback({ success: false, error: "Trop de requêtes." });
        return;
      }

      try {
        // ✅ SECURITY: Verify admin authentication
        if (!socket.data.isAdmin) {
          callback({
            success: false,
            error: "Authentification administrateur requise.",
          });
          return;
        }

        // ✅ SECURITY: Validate code
        if (!validateGameCode(code.toUpperCase())) {
          callback({ success: false, error: "Code de partie invalide." });
          return;
        }

        const result = await joinGameAsHost(code.toUpperCase(), socket.id);

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
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        return;
      }

      const { gameId, isHost, isAdmin } = socket.data;

      // ✅ SECURITY: Verify admin status
      if (!gameId || !isHost || !isAdmin) {
        console.warn(`[Security] Unauthorized kick attempt: ${socket.id}`);
        return;
      }

      // ✅ SECURITY: Validate playerId format
      if (!playerId || typeof playerId !== "string") {
        return;
      }

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
      // ✅ SECURITY: Rate limiting
      if (socketRateLimiter.isLimited(socketRateLimitKey)) {
        return;
      }

      const { gameId, isHost, isAdmin } = socket.data;

      // ✅ SECURITY: Verify admin status
      if (!gameId || !isHost || !isAdmin) {
        return;
      }

      // ✅ SECURITY: Validate settings object
      if (!settings || typeof settings !== "object") {
        return;
      }

      if (updateGameSettings(gameId, settings)) {
        const state = getGameState(gameId);
        if (state) {
          io.to(gameId).emit("game:state", state);
        }
      }
    });

    socket.on("host:start-game", async () => {
      // ✅ SECURITY: Verify host status
      const { gameId, isHost, isAdmin } = socket.data;
      if (!gameId || !isHost || !isAdmin) {
        return;
      }

      const game = getActiveGame(gameId);
      if (!game) return;

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
              timeRemaining: getActiveGame(gameId)?.settings.questionTime || 20,
            });
          }
        }
      );
    });

    socket.on("host:next-question", async () => {
      // ✅ SECURITY: Verify host status
      const { gameId, isHost, isAdmin } = socket.data;
      if (!gameId || !isHost || !isAdmin) {
        return;
      }

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
      // ✅ SECURITY: Verify host status
      const { gameId, isHost, isAdmin } = socket.data;
      if (!gameId || !isHost || !isAdmin) {
        return;
      }

      const result = await finishGame(gameId);
      if (result) {
        io.to(gameId).emit("game:finished", result);
      }
    });
  });

  return io;
}
