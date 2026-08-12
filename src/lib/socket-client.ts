"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/game";
import { useGameStore } from "@/store/game-store";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socketInstance) {
    socketInstance = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => store.setConnected(true);
    const handleDisconnect = () => store.setConnected(false);
    const handleAdminLoginResult = ({ success, message }: { success: boolean; message?: string }) => {
      store.setAdminLoggedIn(success);
      if (!success) {
        store.setError(message || "Connexion administrateur refusée.");
      } else {
        store.setError(null);
      }
    };
    const handleState = (state: Parameters<typeof store.setGameState>[0]) => store.setGameState(state);
    const handlePlayerJoined = (player: Parameters<typeof store.addPlayer>[0]) => store.addPlayer(player);
    const handlePlayerLeft = ({ playerId }: { playerId: string }) => store.removePlayer(playerId);
    const handleCountdown = ({ seconds }: { seconds: number }) => store.setCountdown(seconds);
    const handleQuestionStart = ({ question, timeRemaining }: { question: any; timeRemaining: number }) =>
      store.setQuestion(question, timeRemaining);
    const handleTimerTick = ({ timeRemaining }: { timeRemaining: number }) => store.setTimeRemaining(timeRemaining);
    const handleReveal = (reveal: Parameters<typeof store.setReveal>[0]) => store.setReveal(reveal);
    const handleLeaderboard = ({ entries }: { entries: Parameters<typeof store.setLeaderboard>[0] }) =>
      store.setLeaderboard(entries);
    const handleFinished = (data: Parameters<typeof store.setFinished>[0]) => store.setFinished(data);
    const handleError = ({ message }: { message: string }) => store.setError(message);
    const handleKicked = () => {
      store.setError("Vous avez été exclu de la partie.");
      store.reset();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("admin:login-result", handleAdminLoginResult);
    socket.on("game:state", handleState);
    socket.on("game:player-joined", handlePlayerJoined);
    socket.on("game:player-left", handlePlayerLeft);
    socket.on("game:countdown", handleCountdown);
    socket.on("game:question-start", handleQuestionStart);
    socket.on("game:timer-tick", handleTimerTick);
    socket.on("game:question-reveal", handleReveal);
    socket.on("game:leaderboard", handleLeaderboard);
    socket.on("game:finished", handleFinished);
    socket.on("game:error", handleError);
    socket.on("game:kicked", handleKicked);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("admin:login-result", handleAdminLoginResult);
      socket.off("game:state", handleState);
      socket.off("game:player-joined", handlePlayerJoined);
      socket.off("game:player-left", handlePlayerLeft);
      socket.off("game:countdown", handleCountdown);
      socket.off("game:question-start", handleQuestionStart);
      socket.off("game:timer-tick", handleTimerTick);
      socket.off("game:question-reveal", handleReveal);
      socket.off("game:leaderboard", handleLeaderboard);
      socket.off("game:finished", handleFinished);
      socket.off("game:error", handleError);
      socket.off("game:kicked", handleKicked);
    };
  }, []);

  return socketRef;
}

export function joinGame(
  code: string,
  nickname: string
): Promise<{ success: boolean; error?: string; playerId?: string }> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("player:join", { code: code.toUpperCase(), nickname }, (response) => {
      if (response.success && response.playerId) {
        useGameStore.getState().setPlayerId(response.playerId);
        useGameStore.getState().setGameId(response.gameId ?? null);
        useGameStore.getState().setError(null);
      }
      resolve(response);
    });
  });
}

export function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("admin:login", { email, password }, (response) => {
      if (response.success) {
        useGameStore.getState().setAdminLoggedIn(true);
      } else {
        useGameStore.getState().setAdminLoggedIn(false);
      }
      resolve(response);
    });
  });
}

export function createGame(settings: {
  questionCount: number;
  questionTime: number;
}): Promise<{ success: boolean; code?: string; gameId?: string; error?: string }> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("host:create-game", settings, (response) => {
      const store = useGameStore.getState();
      if (response.success) {
        store.setIsHost(true);
        store.setError(null);
        if (response.gameId) store.setGameId(response.gameId);
        store.setGameState({
          phase: "lobby",
          code: response.code || "",
          players: [],
          settings,
          leaderboard: [],
        });
      }
      resolve(response);
    });
  });
}

export function hostJoinGame(
  code: string
): Promise<{ success: boolean; gameId?: string; code?: string; error?: string }> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("host:join-game", { code: code.toUpperCase() }, (response) => {
      const store = useGameStore.getState();
      if (response.success) {
        store.setIsHost(true);
        store.setError(null);
        if (response.gameId) store.setGameId(response.gameId);
        store.setGameState({
          phase: "lobby",
          code: response.code || code.toUpperCase(),
          players: [],
          settings: store.settings,
          leaderboard: [],
        });
      }
      resolve(response);
    });
  });
}

export function submitAnswer(questionId: string, optionId: string) {
  getSocket().emit("player:answer", { questionId, optionId });
}

export function hostStartGame() {
  getSocket().emit("host:start-game");
}

export function hostNextQuestion() {
  getSocket().emit("host:next-question");
}

export function hostEndGame() {
  getSocket().emit("host:end-game");
}

export function hostKickPlayer(playerId: string) {
  getSocket().emit("host:kick-player", { playerId });
}

export function hostUpdateSettings(settings: {
  questionCount?: number;
  questionTime?: number;
}) {
  getSocket().emit("host:update-settings", settings);
}
