"use client";

import { create } from "zustand";
import type {
  GamePhase,
  PlayerState,
  QuestionState,
  RevealState,
  LeaderboardEntry,
  GameSettings,
  GameStatistics,
} from "@/types/game";

interface GameStore {
  connected: boolean;
  adminLoggedIn: boolean;
  playerId: string | null;
  gameId: string | null;
  isHost: boolean;
  phase: GamePhase;
  code: string;
  players: PlayerState[];
  settings: GameSettings;
  countdown: number | null;
  question: QuestionState | null;
  timeRemaining: number;
  reveal: RevealState | null;
  leaderboard: LeaderboardEntry[];
  statistics: GameStatistics | null;
  error: string | null;

  setConnected: (connected: boolean) => void;
  setAdminLoggedIn: (loggedIn: boolean) => void;
  setPlayerId: (id: string | null) => void;
  setGameId: (id: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setGameState: (state: {
    phase: GamePhase;
    code: string;
    players: PlayerState[];
    settings: GameSettings;
    countdown?: number;
    question?: QuestionState;
    timeRemaining?: number;
    reveal?: RevealState;
    leaderboard?: LeaderboardEntry[];
  }) => void;
  addPlayer: (player: PlayerState) => void;
  removePlayer: (playerId: string) => void;
  setCountdown: (seconds: number) => void;
  setQuestion: (question: QuestionState, timeRemaining: number) => void;
  setTimeRemaining: (time: number) => void;
  setReveal: (reveal: RevealState) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setFinished: (data: {
    leaderboard: LeaderboardEntry[];
    statistics: GameStatistics;
  }) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  adminLoggedIn: false,
  playerId: null,
  gameId: null,
  isHost: false,
  phase: "lobby" as GamePhase,
  code: "",
  players: [] as PlayerState[],
  settings: { questionCount: 10, questionTime: 20 },
  countdown: null as number | null,
  question: null as QuestionState | null,
  timeRemaining: 0,
  reveal: null as RevealState | null,
  leaderboard: [] as LeaderboardEntry[],
  statistics: null as GameStatistics | null,
  error: null as string | null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setAdminLoggedIn: (adminLoggedIn) => set({ adminLoggedIn }),
  setPlayerId: (playerId) => set({ playerId }),
  setGameId: (gameId) => set({ gameId }),
  setIsHost: (isHost) => set({ isHost }),

  setGameState: (state) => {
    const sortedPlayers = [...state.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
      return a.nickname.localeCompare(b.nickname);
    });

    const fallbackLeaderboard = sortedPlayers.map((player, index) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      rank: index + 1,
    }));

    set({
      phase: state.phase,
      code: state.code,
      players: state.players,
      settings: state.settings,
      countdown: state.phase === "countdown" ? (state.countdown ?? null) : null,
      question: state.phase === "question" ? (state.question ?? null) : null,
      timeRemaining:
        state.phase === "question"
          ? state.timeRemaining ?? 0
          : state.phase === "countdown"
            ? state.countdown ?? 0
            : 0,
      reveal: state.phase === "reveal" ? (state.reveal ?? null) : null,
      leaderboard:
        state.phase === "leaderboard" || state.phase === "finished"
          ? state.leaderboard ?? fallbackLeaderboard
          : fallbackLeaderboard,
    });
  },

  addPlayer: (player) =>
    set((s) => ({
      players: [...s.players.filter((p) => p.id !== player.id), player],
    })),

  removePlayer: (playerId) =>
    set((s) => ({
      players: s.players.filter((p) => p.id !== playerId),
    })),

  setCountdown: (seconds) => set({ countdown: seconds, timeRemaining: seconds, phase: "countdown" }),
  setQuestion: (question, timeRemaining) =>
    set({ question, timeRemaining, phase: "question", reveal: null }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setReveal: (reveal) =>
    set((s) => {
      if (reveal?.playerResults) {
        const updatedPlayers = s.players
          .map((player) => {
            const result = reveal.playerResults.find((r) => r.playerId === player.id);
            if (result && result.newScore !== undefined) {
              return { ...player, score: result.newScore };
            }
            return player;
          })
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
            if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
            return a.nickname.localeCompare(b.nickname);
          });

        const ranking = updatedPlayers.map((player, index) => ({
          id: player.id,
          nickname: player.nickname,
          score: player.score,
          rank: index + 1,
        }));

        return { reveal, phase: "reveal", players: updatedPlayers, leaderboard: ranking };
      }
      return { reveal, phase: "reveal" };
    }),
  setLeaderboard: (entries) =>
    set({
      leaderboard: [...entries].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.nickname.localeCompare(b.nickname);
      }),
      phase: "leaderboard",
    }),
  setFinished: (data) =>
    set({
      leaderboard: data.leaderboard,
      statistics: data.statistics,
      phase: "finished",
    }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
