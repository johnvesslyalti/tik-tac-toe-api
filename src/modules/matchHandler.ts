import * as logic from "./logic";
import * as validation from "./validation";

/**
 * Tic-Tac-Toe Nakama Match Handler (TypeScript)
 */

const OpCode = {
  MOVE: 1,
  UPDATE: 2,
  REJECTED: 3,
};

const MATCH_LABEL_TYPE = "tictactoe";

function buildMatchLabel(
  status: "waiting" | "in_progress" | "finished",
  state: logic.GameState,
): string {
  return JSON.stringify({
    type: MATCH_LABEL_TYPE,
    status,
    playerCount: Object.keys(state.players).length,
    open: status === "waiting" ? 1 : 0,
    turn: state.currentPlayer,
    winner: state.winner,
  });
}

function tryUpdateMatchLabel(
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  label: string,
): void {
  try {
    const runtimeDispatcher = dispatcher as nkruntime.MatchDispatcher & {
      matchLabelUpdate?: (value: string) => void;
    };

    if (typeof runtimeDispatcher.matchLabelUpdate === "function") {
      runtimeDispatcher.matchLabelUpdate(label);
    }
  } catch (error: unknown) {
    logger.warn("Skipping match label update: %s", String(error));
  }
}

export function matchInit(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: logic.GameState; tickRate: number; label: string } {
  logger.info("Tic-Tac-Toe match initialized");
  const initialState = logic.createInitialState();
  return {
    state: initialState,
    tickRate: 10,
    label: buildMatchLabel("waiting", initialState),
  };
}

export function matchJoinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any },
): { state: logic.GameState; accept: boolean; rejectMessage?: string } {
  const playerCount = Object.keys(state.players).length;
  if (playerCount >= 2) {
    return {
      state,
      accept: false,
      rejectMessage: "Match already full",
    };
  }
  return {
    state,
    accept: true,
  };
}

export function matchJoin(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presences: nkruntime.Presence[],
): { state: logic.GameState } {
  presences.forEach((presence) => {
    const playerCount = Object.keys(state.players).length;
    const symbol = playerCount === 0 ? "X" : "O";

    state.players[presence.userId] = symbol;
    state.presences[presence.userId] = presence;

    logger.info("Player %s joined as %s", presence.userId, symbol);

    if (Object.keys(state.players).length === 2) {
      state.gameStarted = true;
      tryUpdateMatchLabel(
        dispatcher,
        logger,
        buildMatchLabel("in_progress", state),
      );
      logger.info("Match started: Player X vs Player O");
    } else {
      tryUpdateMatchLabel(
        dispatcher,
        logger,
        buildMatchLabel("waiting", state),
      );
    }
  });

  dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(state));

  return { state };
}

export function matchLoop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  messages: nkruntime.MatchMessage[],
): { state: logic.GameState } | null {
  messages.forEach((message) => {
    if (message.opCode === OpCode.MOVE) {
      let data: { index: number };
      try {
        data = JSON.parse(nk.binaryToString(message.data));
      } catch (e: any) {
        logger.error("Failed to parse message data: %s", e.message);
        return;
      }

      const moveIndex = data.index;
      const userId = message.sender.userId;

      logger.debug("Received move from user %s: index %d", userId, moveIndex);

      const validationResult = validation.isValidMove(state, moveIndex, userId);

      if (validationResult.valid) {
        logic.makeMove(state, moveIndex);

        logger.info(
          "Move accepted from %s at %d. Winner: %s",
          userId,
          moveIndex,
          state.winner,
        );

        if (state.winner) {
          state.endTicks = 100; // Wait 100 ticks (~10 seconds at 10 tickRate) before terminating
          tryUpdateMatchLabel(
            dispatcher,
            logger,
            buildMatchLabel("finished", state),
          );
        } else {
          tryUpdateMatchLabel(
            dispatcher,
            logger,
            buildMatchLabel("in_progress", state),
          );
        }

        dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(state));
      } else {
        logger.warn(
          "Invalid move from user %s: %s",
          userId,
          validationResult.reason,
        );
        dispatcher.broadcastMessage(
          OpCode.REJECTED,
          JSON.stringify({ reason: validationResult.reason }),
          [message.sender],
        );
      }
    }
  });

  if (state.winner) {
    if (state.endTicks > 0) {
      state.endTicks--;
      return { state };
    }
    return null; // Terminate match after grace period
  }

  return { state };
}

export function matchLeave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presences: nkruntime.Presence[],
): { state: logic.GameState } {
  presences.forEach((presence) => {
    logger.info("Player %s left the match", presence.userId);

    if (!state.winner) {
      const leavingSymbol = state.players[presence.userId];
      const remainingSymbol = leavingSymbol === "X" ? "O" : "X";

      state.winner = remainingSymbol;
      logger.info(
        "Player %s left. Remaining player %s wins.",
        presence.userId,
        remainingSymbol,
      );

      dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(state));
    }

    delete state.players[presence.userId];
    delete state.presences[presence.userId];
  });

  const status = state.winner ? "finished" : "waiting";
  tryUpdateMatchLabel(dispatcher, logger, buildMatchLabel(status, state));

  return { state };
}

export function matchTerminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  graceSeconds: number,
): { state: logic.GameState } {
  logger.info("Match terminating");
  return { state };
}

export function matchSignal(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  data: string,
): { state: logic.GameState; result: string } {
  return { state, result: data };
}

export function matchmakerMatched(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[],
): string {
  logger.info(
    "Matchmaker matched -> creating authoritative match for %d players",
    matches.length,
  );
  try {
    const matchId = nk.matchCreate("tic-tac-toe", {});
    return matchId;
  } catch (error: any) {
    logger.error("Failed to create match from matchmaker: %s", error.message);
    throw error;
  }
}
