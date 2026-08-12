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
    socket.on("host:create-game", async (data, callback) => {
      try {
        const result = await createGame(data, socket.id);
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
        const success = await submitAnswer(
          data.questionId,
          data.optionId,
          "",
          ""
        );

        if (success) {
          io.emit("game:state", {
            phase: "question",
            code: "",
            players: [],
            settings: { questionCount: 0, questionTime: 0 },
            leaderboard: [],
          });
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected:", socket.id);
    });
  });
}

