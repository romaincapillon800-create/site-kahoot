export type GamePhase =
  | "lobby"
  | "countdown"
  | "question"
  | "reveal"
  | "leaderboard"
  | "finished";

export type GameStatus = "waiting" | "starting" | "in_progress" | "finished";

export interface PlayerState {
  id: string;
  nickname: string;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  isConnected: boolean;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionState {
  id: string;
  text: string;
  options: QuestionOption[];
  category: string;
  order: number;
  totalQuestions: number;
}

export interface RevealState {
  correctOptionId: string;
  correctOptionText: string;
  explanation: string;
  playerResults: Array<{
    playerId: string;
    nickname: string;
    isCorrect: boolean;
    pointsEarned: number;
    bonus: string | null;
    newScore: number;
  }>;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  rank: number;
  previousRank?: number;
}

export interface GameStatistics {
  totalPlayers: number;
  averageScore: number;
  averageCorrect: number;
  highestScore: number;
}

export interface GameSettings {
  questionCount: number;
  questionTime: number;
}

export interface ServerToClientEvents {
  "admin:login-result": (data: { success: boolean; message?: string }) => void;
  "game:state": (data: {
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
  "game:player-joined": (player: PlayerState) => void;
  "game:player-left": (data: { playerId: string }) => void;
  "game:player-kicked": (data: { playerId: string }) => void;
  "game:countdown": (data: { seconds: number }) => void;
  "game:question-start": (data: {
    question: QuestionState;
    timeRemaining: number;
  }) => void;
  "game:timer-tick": (data: { timeRemaining: number }) => void;
  "game:question-reveal": (data: RevealState) => void;
  "game:leaderboard": (data: { entries: LeaderboardEntry[] }) => void;
  "game:finished": (data: {
    leaderboard: LeaderboardEntry[];
    statistics: GameStatistics;
  }) => void;
  "game:error": (data: { message: string }) => void;
  "game:kicked": () => void;
}

export interface ClientToServerEvents {
  "admin:login": (
    data: { email: string; password: string },
    callback: (response: { success: boolean; message?: string }) => void
  ) => void;
  "player:join": (
    data: { code: string; nickname: string },
    callback: (response: {
      success: boolean;
      error?: string;
      playerId?: string;
      gameId?: string;
    }) => void
  ) => void;
  "player:answer": (data: {
    questionId: string;
    optionId: string;
  }) => void;
  "host:create-game": (
    data: GameSettings,
    callback: (response: {
      success: boolean;
      code?: string;
      gameId?: string;
      error?: string;
    }) => void
  ) => void;
  "host:join-game": (
    data: { code: string },
    callback: (response: {
      success: boolean;
      error?: string;
      gameId?: string;
      code?: string;
    }) => void
  ) => void;
  "host:kick-player": (data: { playerId: string }) => void;
  "host:update-settings": (data: Partial<GameSettings>) => void;
  "host:start-game": () => void;
  "host:next-question": () => void;
  "host:end-game": () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  gameId?: string;
  isHost?: boolean;
  isAdmin?: boolean;
  nickname?: string;
}
