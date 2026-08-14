import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createGame,
  disconnectPlayer,
  getActiveGame,
  getGameState,
  getQuestionState,
  joinGameAsPlayer,
  kickPlayer,
  leaveGame,
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
    assert.ok(game);
    assert.equal(game?.questionIds.length, 5);

    for (let index = 0; index < game!.questionIds.length; index += 1) {
      const question = await getQuestionState(gameId, index);
      assert.ok(question);
      assert.equal(question?.category, "web-client");
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
    assert.ok(!("error" in joinResult));

    const before = getGameState(gameId);
    assert.equal(before?.players.some((player) => player.nickname === "Alice"), true);

    const wasKicked = kickPlayer(gameId, (joinResult as { playerId: string }).playerId);
    assert.equal(wasKicked, true);

    const after = getGameState(gameId);
    assert.equal(after?.players.some((player) => player.nickname === "Alice"), false);
    assert.equal(after?.leaderboard.some((entry) => entry.nickname === "Alice"), false);
  });

  it("allows a refreshed player to reconnect with the same nickname without being kicked", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const firstJoin = await joinGameAsPlayer(code, "Alice", "socket-refresh-1");
    assert.ok(!("error" in firstJoin));

    const disconnected = disconnectPlayer("socket-refresh-1");
    assert.ok(disconnected);
    assert.equal(getActiveGame(gameId)?.players.get(disconnected.playerId)?.isConnected, false);

    const secondJoin = await joinGameAsPlayer(code, "Alice", "socket-refresh-2");
    assert.ok(!("error" in secondJoin));
    assert.equal((secondJoin as { playerId: string }).playerId, disconnected.playerId);
    assert.equal(getActiveGame(gameId)?.players.size, 1);
    assert.equal(getActiveGame(gameId)?.players.get(disconnected.playerId)?.socketId, "socket-refresh-2");
    assert.equal(getActiveGame(gameId)?.players.get(disconnected.playerId)?.isConnected, true);
  });

  it("replaces a stale disconnected player when a new nickname joins", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const firstJoin = await joinGameAsPlayer(code, "Alice", "socket-leave-1");
    assert.ok(!("error" in firstJoin));

    const disconnected = disconnectPlayer("socket-leave-1");
    assert.ok(disconnected);

    const secondJoin = await joinGameAsPlayer(code, "Bob", "socket-leave-2");
    assert.ok(!("error" in secondJoin));
    assert.equal((secondJoin as { playerId: string }).playerId, disconnected.playerId);
    assert.equal(getActiveGame(gameId)?.players.size, 1);
    assert.equal(getActiveGame(gameId)?.players.get(disconnected.playerId)?.nickname, "Bob");
  });

  it("keeps a player score and slot when they leave and come back with the same pseudo", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const firstJoin = await joinGameAsPlayer(code, "Charlie", "socket-leave-ranking-1");
    assert.ok(!("error" in firstJoin));
    const playerId = (firstJoin as { playerId: string }).playerId;

    const wasLeft = leaveGame(gameId, playerId);
    assert.equal(wasLeft, true);
    assert.equal(getActiveGame(gameId)?.players.get(playerId)?.isConnected, false);
    assert.equal(getActiveGame(gameId)?.players.size, 1);

    const rejoin = await joinGameAsPlayer(code, "Charlie", "socket-leave-ranking-2");
    assert.ok(!("error" in rejoin));
    assert.equal((rejoin as { playerId: string }).playerId, playerId);
    assert.equal(getActiveGame(gameId)?.players.get(playerId)?.socketId, "socket-leave-ranking-2");
    assert.equal(getActiveGame(gameId)?.players.get(playerId)?.score, 0);
  });
});
