import * as matchHandler from "./matchHandler";

/**
 * Nakama JavaScript Runtime Entry Point (TypeScript)
 */
export function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  // Register the match handler
  initializer.registerMatch("tic-tac-toe", matchHandler);

  logger.info(
    "Tic-Tac-Toe module loaded (TypeScript) and match registered successfully",
  );
}
