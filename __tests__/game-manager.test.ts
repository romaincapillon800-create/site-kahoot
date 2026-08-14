import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acceptPendingPlayerRequest,
  createGame,
  disconnectPlayer,
  getActiveGame,
  getGameState,
  getQuestionState,
  joinGameAsPlayer,
  kickPlayer,
  leaveGame,
  loadQuestionsForGame,
  rejectPendingPlayerRequest,
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

  it("removes a player when they explicitly leave and allows a fresh join with the same pseudo", async () => {
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
    assert.equal(getActiveGame(gameId)?.players.has(playerId), false);

    const rejoin = await joinGameAsPlayer(code, "Charlie", "socket-leave-ranking-2");
    assert.ok(!("error" in rejoin));
    assert.notEqual((rejoin as { playerId: string }).playerId, playerId);
    assert.equal(getActiveGame(gameId)?.players.get((rejoin as { playerId: string }).playerId)?.nickname, "Charlie");
    assert.equal(getActiveGame(gameId)?.players.get((rejoin as { playerId: string }).playerId)?.score, 0);
  });

  it("refuses joining a game once the leaderboard is visible", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const firstJoin = await joinGameAsPlayer(code, "Daniel", "socket-join-blocked-1");
    assert.ok(!("error" in firstJoin));

    const game = getActiveGame(gameId);
    assert.ok(game);
    game!.phase = "leaderboard";

    const blockedJoin = await joinGameAsPlayer(code, "Eve", "socket-join-blocked-2");
    assert.ok("error" in blockedJoin);
    assert.equal(blockedJoin.error, "Cette partie a déjà commencé. Demandez à un admin de vous accepter.");
  });

  it("queues a requested join during an active game and lets the host accept it for the next question", async () => {
    const { gameId, code } = await createGame(
      {
        questionCount: 5,
        questionTime: 20,
        categories: ["global"],
      },
      "host-test"
    );

    const game = getActiveGame(gameId);
    assert.ok(game);
    game!.phase = "question";

    const pendingJoin = await joinGameAsPlayer(code, "Frank", "socket-pending-1");
    assert.ok("error" in pendingJoin);
    assert.equal(pendingJoin.queued, true);
    assert.ok(pendingJoin.pendingRequestId);
    assert.equal(getActiveGame(gameId)?.pendingPlayers.size, 1);

    const accepted = acceptPendingPlayerRequest(gameId, pendingJoin.pendingRequestId!);
    assert.equal(accepted, true);
    assert.equal(getActiveGame(gameId)?.pendingPlayers.get(pendingJoin.pendingRequestId!)?.accepted, true);

    const rejected = rejectPendingPlayerRequest(gameId, "missing-request");
    assert.equal(rejected, false);
  });
});
