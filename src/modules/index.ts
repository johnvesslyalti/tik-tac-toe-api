import {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLeave,
  matchLoop,
  matchTerminate,
  matchSignal,
  matchmakerMatched,
} from "./matchHandler";
import { createMatchRpc, listMatchesRpc } from "./rpc";

/**
 * Nakama JavaScript Runtime Entry Point (TypeScript)
 */
export function InitModule(
  this: any,
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  // Manual global assignment for ES5/Goja compatibility -
  // though now redundant with our 'strip exports' build step.
  const global: any = this || {};
  global.matchInit = matchInit;
  global.matchJoinAttempt = matchJoinAttempt;
  global.matchJoin = matchJoin;
  global.matchLeave = matchLeave;
  global.matchLoop = matchLoop;
  global.matchTerminate = matchTerminate;
  global.matchSignal = matchSignal;
  global.matchmakerMatched = matchmakerMatched;
  global.createMatchRpc = createMatchRpc;
  global.listMatchesRpc = listMatchesRpc;

  // Register the match handler
  initializer.registerMatch("tic-tac-toe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  // Register the Matchmaker Hook
  initializer.registerMatchmakerMatched(matchmakerMatched);

  // Register RPCs
  initializer.registerRpc("create_match", createMatchRpc);
  initializer.registerRpc("list_matches", listMatchesRpc);

  logger.info(
    "Tic-Tac-Toe module loaded (TypeScript/ES5) and match registered successfully",
  );
}
