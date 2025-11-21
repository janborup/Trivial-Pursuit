
import { BoardNode, CategoryType, Translations } from './types';

export const TEXTS: Translations = {
  setupTitle: { da: 'Trivial Pursuit Opsætning', en: 'Trivial Pursuit Setup' },
  playerDetails: { da: 'Spiller Detaljer', en: 'Player Details' },
  numPlayers: { da: 'Antal Spillere', en: 'Number of Players' },
  addAI: { da: 'Tilføj Computerspiller', en: 'Add Computer Player' },
  aiDifficulty: { da: 'Sværhedsgrad', en: 'Difficulty' },
  startGame: { da: 'Start Spil', en: 'Start Game' },
  rollDice: { da: 'Kast Terning', en: 'Roll Dice' },
  rollAgain: { da: 'Kast Igen', en: 'Roll Again' },
  moveInstruction: { da: 'Vælg et felt at rykke til', en: 'Select a space to move to' },
  category: { da: 'Kategori', en: 'Category' },
  correct: { da: 'Korrekt!', en: 'Correct!' },
  wrong: { da: 'Forkert!', en: 'Wrong!' },
  nextPlayer: { da: 'Næste Spiller', en: 'Next Player' },
  aiThinking: { da: 'Computeren tænker...', en: 'Computer is thinking...' },
  gameOver: { da: 'Spillet er slut!', en: 'Game Over!' },
  winner: { da: 'Vinderen er', en: 'The winner is' },
  newGame: { da: 'Nyt Spil', en: 'New Game' },
  stats: { da: 'Statistik (Tid brugt)', en: 'Statistics (Time spent)' },
  diffEasy: { da: 'Walk In The Park', en: 'Walk In The Park' },
  diffMed: { da: 'On And On', en: 'On And On' },
  diffHard: { da: 'Unbeatable', en: 'Unbeatable' },
  geo: { da: 'Geografi', en: 'Geography' },
  ent: { da: 'Underholdning', en: 'Entertainment' },
  hist: { da: 'Historie', en: 'History' },
  art: { da: 'Kunst & Litteratur', en: 'Art & Literature' },
  sci: { da: 'Videnskab & Natur', en: 'Science & Nature' },
  sport: { da: 'Sport & Fritid', en: 'Sport & Leisure' },
  hub: { da: 'Centrum', en: 'Center' },
  roll_again: { da: 'Kast Igen', en: 'Roll Again' },
  name: { da: 'Navn', en: 'Name' },
  instructions: { da: 'Svar rigtigt på alle 6 farver for at vinde!', en: 'Answer correctly on all 6 colors to win!' },
  activePlayer: { da: 'Nuværende Spiller', en: 'Active Player' },
};

export const CATEGORY_COLORS: Record<CategoryType, string> = {
  [CategoryType.GEOGRAPHY]: '#3b82f6', // Blue
  [CategoryType.ENTERTAINMENT]: '#ec4899', // Pink
  [CategoryType.HISTORY]: '#eab308', // Yellow
  [CategoryType.ART_LITERATURE]: '#a16207', // Brown
  [CategoryType.SCIENCE_NATURE]: '#22c55e', // Green
  [CategoryType.SPORT_LEISURE]: '#f97316', // Orange
  [CategoryType.HUB]: '#f3f4f6', // White
  [CategoryType.ROLL_AGAIN]: '#1f2937', // Dark Gray for Roll Again
};

export const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
];

// --- Board Generation ---
// Center Hub (0)
// 6 Spokes (5 nodes each)
// 6 Wedge HQs (End of spokes)
// Rim: 6 nodes between each HQ.
// Total nodes: 1 (Hub) + 30 (Spokes) + 6 (HQs) + 36 (Rim) = 73 nodes.

const generateBoard = (): BoardNode[] => {
  const nodes: BoardNode[] = [];
  
  const mainCategories = [
    CategoryType.GEOGRAPHY, // Blue
    CategoryType.ENTERTAINMENT, // Pink
    CategoryType.HISTORY, // Yellow
    CategoryType.ART_LITERATURE, // Brown
    CategoryType.SCIENCE_NATURE, // Green
    CategoryType.SPORT_LEISURE, // Orange
  ];

  // 1. Hub
  nodes.push({ id: 0, category: CategoryType.HUB, isWedgeHQ: false, x: 50, y: 50, connections: [] });

  let nextId = 1;
  const radiusStep = 7; // Spacing
  const centerX = 50;
  const centerY = 50;

  const hqIds: number[] = [];
  // const spokeStartIds: number[] = [];

  // 2. Spokes (5 nodes) + HQ (6th)
  for (let i = 0; i < 6; i++) {
    const angleDeg = i * 60 - 90; 
    const angleRad = (angleDeg * Math.PI) / 180;
    const hqCategory = mainCategories[i];
    
    // Determine the "Surround Color" for this HQ.
    // This color is used for the 3 nodes surrounding this specific HQ (Spoke Node 5, Rim Next 1, Rim Prev 6).
    // Using (i + 3) % 6 gives a distinct opposite color.
    const surroundCat = mainCategories[(i + 3) % 6];

    let previousNodeId = 0; // Start connecting from Hub

    // Create 5 spoke nodes
    for (let j = 1; j <= 5; j++) {
      const nodeId = nextId++;
      const distance = j * radiusStep;
      
      // Default Spoke Coloring logic
      let cat = mainCategories[(i + j) % 6]; 
      
      if (j === 5) {
        cat = surroundCat; // Rule: Fields around HQ share a color (different from HQ)
      }

      nodes.push({
        id: nodeId,
        category: cat,
        isWedgeHQ: false,
        x: centerX + Math.cos(angleRad) * distance,
        y: centerY + Math.sin(angleRad) * distance,
        connections: [previousNodeId]
      });
      
      // Connect back
      nodes.find(n => n.id === previousNodeId)?.connections.push(nodeId);
      previousNodeId = nodeId;
    }

    // Create HQ Node (6th position)
    const hqId = nextId++;
    const hqDist = 6 * radiusStep;
    hqIds.push(hqId);

    nodes.push({
      id: hqId,
      category: hqCategory,
      isWedgeHQ: true,
      x: centerX + Math.cos(angleRad) * hqDist,
      y: centerY + Math.sin(angleRad) * hqDist,
      connections: [previousNodeId]
    });
    nodes.find(n => n.id === previousNodeId)?.connections.push(hqId);
  }

  // 3. Rim Connections (6 nodes between HQs)
  // Indices in gap: 1, 2, 3, 4, 5, 6
  // Node 1: Neighbor to StartHQ -> Must be StartHQ's surround color
  // Node 6: Neighbor to EndHQ -> Must be EndHQ's surround color
  // Node 2, 5: Roll Again
  
  for (let i = 0; i < 6; i++) {
    const startHqId = hqIds[i];
    const endHqId = hqIds[(i + 1) % 6];
    
    // Identify surround colors for the start and end HQs of this rim segment
    const startSurroundCat = mainCategories[(i + 3) % 6];
    const endSurroundCat = mainCategories[((i + 1) + 3) % 6]; // Logic follows the HQ index

    let previousRimNodeId = startHqId;
    
    const startAngle = (i * 60 - 90);
    const totalAngle = 60;
    const steps = 7; // 6 nodes + 1 final connection = 7 steps

    for (let k = 1; k <= 6; k++) {
      const nodeId = nextId++;
      const currentAngleDeg = startAngle + (k * (totalAngle / steps));
      const currentAngleRad = (currentAngleDeg * Math.PI) / 180;
      const dist = 6 * radiusStep; // Same radius as HQs

      let cat: CategoryType;

      if (k === 1) {
        cat = startSurroundCat; // Rule: Neighbor to Start HQ has specific surround color
      } else if (k === 6) {
        cat = endSurroundCat; // Rule: Neighbor to End HQ has specific surround color
      } else if (k === 2 || k === 5) {
        cat = CategoryType.ROLL_AGAIN; // Rule: Field 2 and 5 are Roll Again
      } else {
        // Nodes 3 and 4
        // Pick colors that aren't the HQ colors if possible to ensure variety
        // Simple offset logic
        cat = mainCategories[(i + k + 2) % 6];
      }

      nodes.push({
        id: nodeId,
        category: cat,
        isWedgeHQ: false,
        x: centerX + Math.cos(currentAngleRad) * dist,
        y: centerY + Math.sin(currentAngleRad) * dist,
        connections: [previousRimNodeId]
      });

      // Connect back
      nodes.find(n => n.id === previousRimNodeId)?.connections.push(nodeId);
      previousRimNodeId = nodeId;
    }

    // Connect last rim node to End HQ
    nodes.find(n => n.id === previousRimNodeId)?.connections.push(endHqId);
    nodes.find(n => n.id === endHqId)?.connections.push(previousRimNodeId);
  }

  return nodes;
};

export const BOARD_NODES = generateBoard();
