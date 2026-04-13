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

export const matchInit: nkruntime.MatchInitFunction<logic.GameState> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
) => {
  logger.info("Tic-Tac-Toe match initialized");
  return {
    state: logic.createInitialState(),
    tickRate: 10,
    label: "tic-tac-toe",
  };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<
  logic.GameState
> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any },
) => {
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
};

export const matchJoin: nkruntime.MatchJoinFunction<logic.GameState> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presences: nkruntime.Presence[],
) => {
  presences.forEach((presence) => {
    const playerCount = Object.keys(state.players).length;
    const symbol = playerCount === 0 ? "X" : "O";

    state.players[presence.userId] = symbol;
    state.presences[presence.userId] = presence;

    logger.info("Player %s joined as %s", presence.userId, symbol);
  });

  dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(state));

  return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<logic.GameState> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  messages: nkruntime.MatchMessage[],
) => {
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
        const newState = logic.makeMove(state, moveIndex);
        Object.assign(state, newState);

        logger.info(
          "Move accepted from %s at %d. Winner: %s",
          userId,
          moveIndex,
          state.winner,
        );
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

  return state.winner ? null : { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<logic.GameState> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  presences: nkruntime.Presence[],
) => {
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

  return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<
  logic.GameState
> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  graceSeconds: number,
) => {
  logger.info("Match terminating");
  return { state };
};

export const matchSignal: nkruntime.MatchSignalFunction<logic.GameState> = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: logic.GameState,
  data: string,
) => {
  return { state, result: data };
};
