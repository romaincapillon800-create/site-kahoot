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
  joinGameAsPlayer,
  submitAnswer,
  startGameCountdown,
  startQuestion,
  revealQuestion,
  finishGame,
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
    socket.on("host:create-game", async (data, callback) => {
      try {
        const result = await createGame(data, socket.id);
        
        // ✅ Stocker les données du socket
        socket.data.gameId = result.gameId;
        socket.data.isHost = true;
        socket.join(result.gameId);
        
        callback({
          success: true,
          gameId: result.gameId,
          code: result.code,
        });

        // Broadcast game state
        const gameState = await getGameState(result.gameId);
        if (gameState) {
          io.to(result.gameId).emit("game:state", gameState);
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    // ===== PLAYER EVENTS =====
    socket.on("player:join", async (data, callback) => {
      try {
        const result = await joinGameAsPlayer(data.code, data.nickname, socket.id);
        
        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        // ✅ Stocker les données du socket
        socket.data.gameId = result.gameId;
        socket.data.playerId = result.playerId;
        socket.data.nickname = data.nickname;
        socket.join(result.gameId);
        
        callback({
          success: true,
          gameId: result.gameId,
          playerId: result.playerId,
        });

        // Broadcast updated game state
        const gameState = await getGameState(result.gameId);
        if (gameState) {
          io.to(result.gameId).emit("game:state", gameState);
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("player:answer", async (data) => {
      try {
        if (!socket.data.gameId || !socket.data.playerId) return;
        
        const success = await submitAnswer(
          socket.data.gameId,
          socket.data.playerId,
          data.questionId,
          data.optionId
        );

        if (success) {
          const gameState = await getGameState(socket.data.gameId);
          if (gameState) {
            io.to(socket.data.gameId).emit("game:state", gameState);
          }
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
      }
    });

    socket.on("host:start-game", async () => {
      try {
        if (!socket.data.gameId) return;
        
        const game = getActiveGame(socket.data.gameId);
        if (!game || game.hostSocketId !== socket.id) return;

        const success = await startGameCountdown(
          socket.data.gameId,
          (seconds) => {
            io.to(socket.data.gameId!).emit("game:countdown", { seconds });
          },
          async () => {
            const question = await startQuestion(
              socket.data.gameId!,
              (timeRemaining) => {
                io.to(socket.data.gameId!).emit("game:timer-tick", { timeRemaining });
              },
              async () => {
                const reveal = await revealQuestion(socket.data.gameId!);
                if (reveal) {
                  io.to(socket.data.gameId!).emit("game:question-reveal", reveal);
                }
              }
            );
            if (question) {
              io.to(socket.data.gameId!).emit("game:question-start", {
                question,
                timeRemaining: game!.timeRemaining,
              });
            }
          }
        );
      } catch (error) {
        console.error("Error starting game:", error);
      }
    });

    socket.on("host:next-question", async () => {
      try {
        if (!socket.data.gameId) return;
        
        const game = getActiveGame(socket.data.gameId);
        if (!game || game.hostSocketId !== socket.id) return;

        const question = await startQuestion(
          socket.data.gameId,
          (timeRemaining) => {
            io.to(socket.data.gameId!).emit("game:timer-tick", { timeRemaining });
          },
          async () => {
            const reveal = await revealQuestion(socket.data.gameId!);
            if (reveal) {
              io.to(socket.data.gameId!).emit("game:question-reveal", reveal);
            }
          }
        );

        if (question) {
          io.to(socket.data.gameId).emit("game:question-start", {
            question,
            timeRemaining: game.timeRemaining,
          });
        }
      } catch (error) {
        console.error("Error next question:", error);
      }
    });

    socket.on("host:end-game", async () => {
      try {
        if (!socket.data.gameId) return;
        
        const game = getActiveGame(socket.data.gameId);
        if (!game || game.hostSocketId !== socket.id) return;

        const result = await finishGame(socket.data.gameId);
        if (result) {
          io.to(socket.data.gameId).emit("game:finished", result);
          io.in(socket.data.gameId).socketsLeave(socket.data.gameId);
        }
      } catch (error) {
        console.error("Error ending game:", error);
      }
    });

    socket.on("host:join-game", async (data, callback) => {
      try {
        // Simple join as host - just track the game
        // ✅ Stocker les données du socket
        socket.data.gameId = data.code;
        socket.data.isHost = true;
        socket.join(data.code);
        
        callback({
          success: true,
          gameId: data.code,
          code: data.code,
        });

        // Broadcast game state
        const gameState = await getGameState(data.code);
        if (gameState) {
          io.to(data.code).emit("game:state", gameState);
        }
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:kick-player", async (data) => {
      try {
        if (!socket.data.gameId) return;
        // TODO: Implement kick player
        console.log("Kick player:", data.playerId);
      } catch (error) {
        console.error("Error kicking player:", error);
      }
    });

    socket.on("host:update-settings", async (data) => {
      try {
        if (!socket.data.gameId) return;
        // TODO: Implement update settings
        console.log("Update settings:", data);
      } catch (error) {
        console.error("Error updating settings:", error);
      }
    });

    socket.on("admin:login", async (data, callback) => {
      try {
        // TODO: Implement admin login
        callback({ success: false, message: "Admin login not implemented" });
      } catch (error) {
        callback({ success: false, message: String(error) });
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected:", socket.id);
    });
  });
}

