
export enum CategoryType {
  GEOGRAPHY = 'GEOGRAPHY',
  ENTERTAINMENT = 'ENTERTAINMENT',
  HISTORY = 'HISTORY',
  ART_LITERATURE = 'ART_LITERATURE',
  SCIENCE_NATURE = 'SCIENCE_NATURE',
  SPORT_LEISURE = 'SPORT_LEISURE',
  HUB = 'HUB',
  ROLL_AGAIN = 'ROLL_AGAIN', // New Category
}

export enum AIDifficulty {
  WALK_IN_THE_PARK = 30, // 30% correct
  ON_AND_ON = 50, // 50% correct
  UNBEATABLE = 80, // 80% correct
}

export interface Player {
  id: number;
  isAI: boolean;
  difficulty: AIDifficulty; // Now applies to humans too (for question difficulty)
  name: string;
  color: string;
  positionNodeId: number;
  wedges: CategoryType[];
  totalTimeMs: number;
}

export interface BoardNode {
  id: number;
  category: CategoryType;
  isWedgeHQ: boolean;
  x: number; 
  y: number;
  connections: number[];
}

export interface Question {
  category: CategoryType;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export enum GamePhase {
  SETUP_COUNT = 'SETUP_COUNT', // Step 1: Num players
  SETUP_DETAILS = 'SETUP_DETAILS', // Step 2: Names & Difficulty
  ROLL_DICE = 'ROLL_DICE',
  MOVE_TOKEN = 'MOVE_TOKEN',
  ANSWER_QUESTION = 'ANSWER_QUESTION',
  GAME_OVER = 'GAME_OVER',
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  diceValue: number | null;
  possibleMoves: number[];
  currentQuestion: Question | null;
  language: 'da' | 'en';
  turnStartTime: number;
  winnerId: number | null;
  showWedgeConfetti: boolean; // New visual state
}

export interface Translations {
  [key: string]: {
    da: string;
    en: string;
  };
}
