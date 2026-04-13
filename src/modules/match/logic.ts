/**
 * Core Tic-Tac-Toe Game Logic (TypeScript)
 */

export interface GameState {
  board: (string | null)[];
  currentPlayer: "X" | "O";
  winner: string | null;
  players: { [userId: string]: "X" | "O" };
  presences: { [userId: string]: any }; // Using any since Presence depends on nkruntime
}

export function createInitialState(): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    players: {},
    presences: {},
  };
}

export function checkWinner(board: (string | null)[]): string | null {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Cols
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  // Check for draw (no nulls left)
  if (!board.includes(null)) {
    return "draw";
  }

  return null;
}

export function makeMove(state: GameState, index: number): GameState {
  if (state.winner || state.board[index] !== null) {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[index] = state.currentPlayer;

  const winner = checkWinner(newBoard);
  const nextPlayer = state.currentPlayer === "X" ? "O" : "X";

  return {
    ...state,
    board: newBoard,
    currentPlayer: winner ? state.currentPlayer : nextPlayer,
    winner: winner,
  };
}
