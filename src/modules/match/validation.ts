import { GameState } from "./logic";

/**
 * Move Validation Module (TypeScript)
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function isValidMove(
  state: GameState,
  index: number,
  userId: string,
): ValidationResult {
  // 1. Check if game is already over
  if (state.winner) {
    return { valid: false, reason: "Game is already finished" };
  }

  // 2. Check if index is within bounds
  if (index < 0 || index > 8) {
    return { valid: false, reason: "Index out of bounds" };
  }

  // 3. Check if cell is already occupied
  if (state.board[index] !== null) {
    return { valid: false, reason: "Cell is already occupied" };
  }

  // 4. Check if it's the player's turn
  const playerSymbol = state.players[userId];
  if (!playerSymbol) {
    return { valid: false, reason: "User is not a player in this match" };
  }

  if (playerSymbol !== state.currentPlayer) {
    return { valid: false, reason: "It is not your turn" };
  }

  return { valid: true };
}
