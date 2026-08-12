import questionsData from "@/data/questions.json";
import { generateGameCode, calculatePoints } from "./utils";
import type {
  GamePhase,
  PlayerState,
  QuestionState,
  LeaderboardEntry,
  RevealState,
  GameSettings,
} from "@/types/game";

interface JsonQuestion {
  text: string;
  category: string;
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

interface CatalogQuestion extends JsonQuestion {
  id: string;
}

interface ActiveGame {
  id: string;
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Map<string, PlayerState & { socketId: string | null; streak: number }>;
  questionIds: string[];
  currentQuestionIndex: number;
  timer: NodeJS.Timeout | null;
  timeRemaining: number;
  questionStartTime: number;
  answers: Map<string, Map<string, { optionId: string; timeRemaining: number }>>;
  hostSocketId: string | null;
}

const questionCatalog: CatalogQuestion[] = (questionsData as JsonQuestion[]).map((question, index) => ({
  ...question,
  id: `question-${index + 1}`,
}));

const activeGames = new Map<string, ActiveGame>();

export function getActiveGame(gameId: string): ActiveGame | undefined {
  return activeGames.get(gameId);
}

export function getActiveGameByCode(code: string): ActiveGame | undefined {
  for (const game of activeGames.values()) {
    if (game.code === code.toUpperCase()) return game;
  }
  return undefined;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toPlayerState(player: PlayerState & { socketId: string | null; streak: number }): PlayerState {
  return {
    id: player.id,
    nickname: player.nickname,
    score: player.score,
    streak: player.streak,
    maxStreak: player.maxStreak,
    correctCount: player.correctCount,
    isConnected: player.isConnected,
  };
}

function getQuestionById(questionId: string): CatalogQuestion | undefined {
  return questionCatalog.find((question) => question.id === questionId);
}

function buildQuestionState(questionId: string, index: number, totalQuestions: number): QuestionState | null {
  const question = getQuestionById(questionId);
  if (!question) return null;

  return {
    id: question.id,
    text: question.text,
    category: question.category,
    order: index + 1,
    totalQuestions,
    options: question.options.map((option, optionIndex) => ({
      id: `${question.id}-option-${optionIndex}`,
      text: option.text,
    })),
  };
}

function getLeaderboard(game: ActiveGame): LeaderboardEntry[] {
  return Array.from(game.players.values())
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

export async function createGame(
  settings: GameSettings,
  hostSocketId: string
): Promise<{ gameId: string; code: string }> {
  let code = generateGameCode();
  let attempts = 0;

  while (attempts < 10) {
    if (!getActiveGameByCode(code)) break;
    code = generateGameCode();
    attempts++;
  }

  const selectedQuestions = shuffle(questionCatalog)
    .slice(0, Math.min(settings.questionCount, questionCatalog.length));

  const gameId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const activeGame: ActiveGame = {
    id: gameId,
    code,
    phase: "lobby",
    settings,
    players: new Map(),
    questionIds: selectedQuestions.map((question) => question.id),
    currentQuestionIndex: -1,
    timer: null,
    timeRemaining: settings.questionTime,
    questionStartTime: 0,
    answers: new Map(),
    hostSocketId,
  };

  activeGames.set(gameId, activeGame);
  return { gameId, code };
}

export async function joinGameAsHost(
  code: string,
  hostSocketId: string
): Promise<{ gameId: string; code: string } | null> {
  const game = getActiveGameByCode(code);

  if (!game) return null;

  game.hostSocketId = hostSocketId;
  return { gameId: game.id, code: game.code };
}

export async function joinGameAsPlayer(
  code: string,
  nickname: string,
  socketId: string
): Promise<{ playerId: string; gameId: string } | { error: string }> {
  const activeGame = getActiveGameByCode(code);

  if (!activeGame) {
    return { error: "Partie introuvable. Vérifiez le code." };
  }

  if (activeGame.phase === "finished") {
    return { error: "Cette partie est terminée." };
  }

  const trimmedNick = nickname.trim().slice(0, 20);
  if (trimmedNick.length < 2) {
    return { error: "Le pseudo doit contenir au moins 2 caractères." };
  }

  for (const p of activeGame.players.values()) {
    if (p.nickname.toLowerCase() === trimmedNick.toLowerCase()) {
      return { error: "Ce pseudo est déjà pris." };
    }
  }

  if (activeGame.players.size >= 50) {
    return { error: "La partie est complète (50 joueurs max)." };
  }

  const playerId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  activeGame.players.set(playerId, {
    id: playerId,
    nickname: trimmedNick,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    isConnected: true,
    socketId,
  });

  return { playerId, gameId: activeGame.id };
}

export function kickPlayer(gameId: string, playerId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game) return false;

  if (!game.players.has(playerId)) return false;

  game.players.delete(playerId);
  return true;
}

export function updateGameSettings(
  gameId: string,
  settings: Partial<GameSettings>
): boolean {
  const game = activeGames.get(gameId);
  if (!game || game.phase !== "lobby") return false;

  const previousQuestionCount = game.settings.questionCount;

  if (settings.questionCount !== undefined) {
    game.settings.questionCount = Math.min(50, Math.max(5, settings.questionCount));
  }
  if (settings.questionTime !== undefined) {
    game.settings.questionTime = Math.min(60, Math.max(10, settings.questionTime));
  }

  if (settings.questionCount !== undefined && settings.questionCount !== previousQuestionCount) {
    const selectedQuestions = shuffle(questionCatalog).slice(
      0,
      Math.min(game.settings.questionCount, questionCatalog.length)
    );
    game.questionIds = selectedQuestions.map((question) => question.id);
  }

  game.timeRemaining = game.settings.questionTime;

  return true;
}

export async function getQuestionState(
  gameId: string,
  index: number
): Promise<QuestionState | null> {
  const game = activeGames.get(gameId);
  if (!game || index < 0 || index >= game.questionIds.length) return null;

  return buildQuestionState(game.questionIds[index], index, game.questionIds.length);
}

export function clearGameTimer(game: ActiveGame): void {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }
}

export async function startGameCountdown(
  gameId: string,
  onTick: (seconds: number) => void,
  onComplete: () => void
): Promise<boolean> {
  const game = activeGames.get(gameId);
  if (!game || game.players.size === 0) return false;

  game.phase = "countdown";
  let seconds = 5;

  onTick(seconds);

  const interval = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      onTick(seconds);
    } else {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);

  return true;
}

export async function startQuestion(
  gameId: string,
  onTick: (timeRemaining: number) => void,
  onComplete: () => Promise<void>
): Promise<QuestionState | null> {
  const game = activeGames.get(gameId);
  if (!game) return null;

  clearGameTimer(game);
  game.currentQuestionIndex++;
  game.answers.set(game.questionIds[game.currentQuestionIndex], new Map());
  game.timeRemaining = game.settings.questionTime;
  game.questionStartTime = Date.now();
  game.phase = "question";

  const question = await getQuestionState(gameId, game.currentQuestionIndex);
  if (!question) return null;

  onTick(game.timeRemaining);

  game.timer = setInterval(() => {
    game.timeRemaining--;
    onTick(game.timeRemaining);

    if (game.timeRemaining <= 0) {
      clearGameTimer(game);
      void onComplete();
    }
  }, 1000);

  return question;
}

export async function submitAnswer(
  gameId: string,
  playerId: string,
  questionId: string,
  optionId: string
): Promise<boolean> {
  const game = activeGames.get(gameId);
  if (!game || game.phase !== "question") return false;

  const currentQId = game.questionIds[game.currentQuestionIndex];
  if (currentQId !== questionId) return false;

  const questionAnswers = game.answers.get(questionId);
  if (!questionAnswers || questionAnswers.has(playerId)) return false;

  questionAnswers.set(playerId, {
    optionId,
    timeRemaining: game.timeRemaining,
  });

  return true;
}

export async function revealQuestion(gameId: string): Promise<RevealState | null> {
  const game = activeGames.get(gameId);
  if (!game) return null;

  clearGameTimer(game);
  game.phase = "reveal";

  const questionId = game.questionIds[game.currentQuestionIndex];
  const question = getQuestionById(questionId);
  if (!question) return null;

  const correctOptionIndex = question.options.findIndex((option) => option.isCorrect);
  if (correctOptionIndex < 0) return null;

  const correctOptionId = `${questionId}-option-${correctOptionIndex}`;
  const correctOptionText = question.options[correctOptionIndex].text;
  const questionAnswers = game.answers.get(questionId) || new Map();
  const playerResults: RevealState["playerResults"] = [];

  for (const [playerId, player] of game.players) {
    const answer = questionAnswers.get(playerId);
    let isCorrect = false;
    let pointsEarned = 0;
    let bonus: string | null = null;

    if (answer) {
      isCorrect = answer.optionId === correctOptionId;

      if (isCorrect) {
        player.streak++;
        player.maxStreak = Math.max(player.maxStreak, player.streak);
        player.correctCount++;
        const result = calculatePoints(
          true,
          answer.timeRemaining,
          game.settings.questionTime,
          player.streak
        );
        pointsEarned = result.points;
        bonus = result.bonus;
        player.score += pointsEarned;
      } else {
        player.streak = 0;
      }
    }

    playerResults.push({
      playerId,
      nickname: player.nickname,
      isCorrect,
      pointsEarned,
      bonus,
      newScore: player.score,
    });
  }

  return {
    correctOptionId: correctOptionId,
    correctOptionText: correctOptionText,
    explanation: question.explanation,
    playerResults,
  };
}

export function getGameState(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return null;

  const currentQuestion =
    game.phase === "question" || game.phase === "reveal"
      ? buildQuestionState(game.questionIds[game.currentQuestionIndex], game.currentQuestionIndex, game.questionIds.length)
      : undefined;

  return {
    phase: game.phase,
    code: game.code,
    players: Array.from(game.players.values()).map(toPlayerState),
    settings: game.settings,
    countdown: game.phase === "countdown" ? game.timeRemaining : undefined,
    timeRemaining: game.timeRemaining,
    question: currentQuestion ?? undefined,
    leaderboard: getLeaderboard(game),
  };
}

export async function finishGame(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return null;

  clearGameTimer(game);
  game.phase = "finished";

  const players = Array.from(game.players.values());
  const avgScore =
    players.length > 0
      ? players.reduce((sum, p) => sum + p.score, 0) / players.length
      : 0;
  const avgCorrect =
    players.length > 0
      ? players.reduce((sum, p) => sum + p.correctCount, 0) / players.length
      : 0;

  const leaderboard = getLeaderboard(game);
  const statistics = {
    totalPlayers: players.length,
    averageScore: Math.round(avgScore),
    averageCorrect: Math.round(avgCorrect * 10) / 10,
    highestScore: Math.max(...players.map((p) => p.score), 0),
  };

  activeGames.delete(gameId);

  return {
    leaderboard,
    statistics,
  };
}

export function disconnectPlayer(socketId: string): { gameId: string; playerId: string } | null {
  for (const game of activeGames.values()) {
    for (const [playerId, player] of game.players) {
      if (player.socketId === socketId) {
        player.isConnected = false;
        player.socketId = null;
        return { gameId: game.id, playerId };
      }
    }
  }
  return null;
}

export function reconnectPlayer(gameId: string, playerId: string, socketId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game) return false;

  const player = game.players.get(playerId);
  if (!player) return false;

  player.isConnected = true;
  player.socketId = socketId;

  return true;
}

export async function loadQuestionsForGame(gameId: string): Promise<void> {
  const game = activeGames.get(gameId);
  if (!game || game.questionIds.length > 0) return;

  const selectedQuestions = shuffle(questionCatalog).slice(
    0,
    Math.min(game.settings.questionCount, questionCatalog.length)
  );
  game.questionIds = selectedQuestions.map((question) => question.id);
}
