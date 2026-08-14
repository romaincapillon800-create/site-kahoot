import { describe, it, expect } from "node:test";

import {
  createGame,
  getActiveGame,
  getGameState,
  getQuestionState,
  joinGameAsPlayer,
  kickPlayer,
  loadQuestionsForGame,
} from "../src/lib/game-manager";

describe("category filtering", () => {
  it("keeps selected category ids instead of UI labels", async () => {
    const { gameId } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["web-client"],
      },
      "host-test"
    );

    await loadQuestionsForGame(gameId);

    const game = getActiveGame(gameId);
    expect(game).toBeTruthy();
    expect(game?.questionIds.length).toBe(5);

    for (let index = 0; index < game!.questionIds.length; index += 1) {
      const question = await getQuestionState(gameId, index);
      expect(question).not.toBeNull();
      expect(question?.category).toBe("web-client");
    }
  });

  it("removes a kicked player from the game state and leaderboard", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const joinResult = await joinGameAsPlayer(code, "Alice", "socket-player-1");
    expect("error" in joinResult).toBe(false);

    const before = getGameState(gameId);
    expect(before?.players.some((player) => player.nickname === "Alice")).toBe(true);

    const wasKicked = kickPlayer(gameId, (joinResult as { playerId: string }).playerId);
    expect(wasKicked).toBe(true);

    const after = getGameState(gameId);
    expect(after?.players.some((player) => player.nickname === "Alice")).toBe(false);
    expect(after?.leaderboard.some((entry) => entry.nickname === "Alice")).toBe(false);
  });
});
