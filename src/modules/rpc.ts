/**
 * Tic-Tac-Toe Nakama RPC Functions (TypeScript)
 */

/**
 * Creates a new authoritative Tic-Tac-Toe match.
 */
export function createMatchRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  logger.info("RPC: create_match called by user %s", ctx.userId);

  try {
    const matchId = nk.matchCreate("tic-tac-toe", {});
    return JSON.stringify({ match_id: matchId });
  } catch (e: any) {
    logger.error("Failed to create match: %s", e.message);
    throw new Error("Could not create match", { cause: e });
  }
}

/**
 * Lists active Tic-Tac-Toe matches.
 */
export function listMatchesRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  logger.debug("RPC: list_matches called");

  try {
    const matches = nk.matchList(10, true, null, 0, 2, "+label.type:tictactoe");
    logger.info("Matches found: %s", JSON.stringify(matches));
    return JSON.stringify({ matches });
  } catch (e: any) {
    logger.error("Failed to list matches: %s", e.message);
    throw new Error("Could not list matches", { cause: e });
  }
}
