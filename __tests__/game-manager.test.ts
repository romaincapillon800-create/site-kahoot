import { describe, it, expect } from "node:test";

import { createGame, getActiveGame, getQuestionState, loadQuestionsForGame } from "../src/lib/game-manager";

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
});
