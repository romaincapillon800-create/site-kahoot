import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  GameSettings,
} from "@/types/game";
import {
  createGame,
  joinGameAsPlayer,
  submitAnswer,
  startGameCountdown,
  startQuestion,
  revealQuestion,
  finishGame,
  disconnectPlayer,
  getActiveGame,
  getGameState,
} from "./game-manager";

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("[Socket] Connected:", socket.id);

    // ===== HOST EVENTS =====
    socket.on("host:create-game", async (settings: GameSettings, callback) => {
      try {
        const result = await createGame(settings, socket.id);
        socket.join(result.gameId);
        callback({
          success: true,
          gameId: result.gameId,
          code: result.code,
        });

        // Broadcast game state
        const gameState = await getGameState(result.gameId);
        io.to(result.gameId).emit("game:state", gameState);
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // ===== PLAYER EVENTS =====
    socket.on("player:join", async (data: { code: string; nickname: string }, callback) => {
      try {
        const result = await joinGameAsPlayer(data.code, data.nickname, socket.id);
        
        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(result.gameId);
        callback({
          success: true,
          gameId: result.gameId,
          playerId: result.playerId,
        });

        // Broadcast updated game state
        const gameState = await getGameState(result.gameId);
        io.to(result.gameId).emit("game:state", gameState);
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("player:answer", async (data: { gameId: string; playerId: string; questionId: string; selectedOptionId: string }, callback) => {
      try {
        const success = await submitAnswer(
          data.gameId,
          data.playerId,
          data.questionId,
          data.selectedOptionId
        );
        callback({ success });

        if (success) {
          const gameState = await getGameState(data.gameId);
          io.to(data.gameId).emit("game:state", gameState);
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // ===== HOST GAME CONTROL EVENTS =====
    socket.on("host:start-game", async (gameId: string, callback) => {
      try {
        const game = getActiveGame(gameId);
        if (!game || game.hostSocketId !== socket.id) {
          callback({ success: false, error: "Not authorized" });
          return;
        }

        const success = await startGameCountdown(
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
                }
              }
            );
            if (question) {
              io.to(gameId).emit("game:question-start", {
                question,
                timeRemaining: game.timeRemaining,
              });
            }
          }
        );
        callback({ success });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:next-question", async (gameId: string, callback) => {
      try {
        const game = getActiveGame(gameId);
        if (!game || game.hostSocketId !== socket.id) {
          callback({ success: false, error: "Not authorized" });
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
            }
          }
        );

        if (question) {
          callback({ success: true });
          io.to(gameId).emit("game:question-start", {
            question,
            timeRemaining: game!.timeRemaining,
          });
        } else {
          callback({ success: false, error: "Could not load question" });
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:end-game", async (gameId: string, callback) => {
      try {
        const game = getActiveGame(gameId);
        if (!game || game.hostSocketId !== socket.id) {
          callback({ success: false, error: "Not authorized" });
          return;
        }

        const result = await finishGame(gameId);
        callback({ success: true });
        io.to(gameId).emit("game:finished", result);
        
        // Disconnect all players
        io.in(gameId).socketsLeave(gameId);
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected:", socket.id);
    });
  });
}

