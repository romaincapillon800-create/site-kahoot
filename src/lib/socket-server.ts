import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
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
} from "./game-manager";

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("[Socket] Player connected:", socket.id);

    socket.on("host:create-game", async (settings, callback) => {
      try {
        const game = await createGame(socket.id, settings);
        socket.join(game.id);
        callback({ success: true, gameId: game.id, code: game.code });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("player:join", async (data, callback) => {
      try {
        const { code, nickname } = data;
        const game = await joinGameAsPlayer(code, nickname, socket.id);
        socket.join(game.id);
        socket.to(game.id).emit("game:player-joined", { nickname });
        callback({ success: true, gameId: game.id });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("player:answer", async (data, callback) => {
      try {
        const result = await submitAnswer(
          data.gameId,
          data.playerId,
          data.questionId,
          data.selectedOptionId
        );
        socket
          .to(data.gameId)
          .emit("game:answer-submitted", { playerId: data.playerId });
        callback({ success: true, ...result });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:start-game", async (gameId, callback) => {
      try {
        await startGameCountdown(gameId, socket.id);
        socket.to(gameId).emit("game:countdown", { seconds: 3 });
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:next-question", async (gameId, callback) => {
      try {
        const state = await startQuestion(gameId, socket.id);
        socket.to(gameId).emit("game:question-start", state);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("host:end-game", async (gameId, callback) => {
      try {
        const result = await finishGame(gameId, socket.id);
        socket.to(gameId).emit("game:finished", result);
        socket.in(gameId).socketsLeave(gameId);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: String(error) });
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Player disconnected:", socket.id);
      // TODO: Handle cleanup
    });
  });
}
