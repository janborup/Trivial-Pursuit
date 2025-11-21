
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Player, GamePhase, AIDifficulty, CategoryType, 
  BoardNode 
} from './types';
import { TEXTS, BOARD_NODES, PLAYER_COLORS, CATEGORY_COLORS } from './constants';
import GameBoard from './components/GameBoard';
import Dice from './components/Dice';
import QuestionModal from './components/QuestionModal';
import Confetti from './components/Confetti';
import { generateQuestion } from './services/geminiService';

const getReachableNodes = (startNodeId: number, steps: number): number[] => {
  const reachable = new Set<number>();
  
  // Recursive DFS to find nodes at exact distance without backtracking immediately
  // This prevents moving A->B->A.
  const traverse = (currentId: number, stepsLeft: number, previousId: number | null) => {
    if (stepsLeft === 0) {
      reachable.add(currentId);
      return;
    }

    const node = BOARD_NODES.find(n => n.id === currentId);
    if (!node) return;

    for (const connectionId of node.connections) {
      // Strict rule: Cannot go back to the node we just came from
      if (connectionId !== previousId) {
        traverse(connectionId, stepsLeft - 1, currentId);
      }
    }
  };

  traverse(startNodeId, steps, null);
  
  // Ensure we don't end up on the start node (in case of loops matching step count)
  // Trivial pursuit usually forces a move away.
  return Array.from(reachable).filter(id => id !== startNodeId);
};

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  phase: GamePhase.SETUP_COUNT,
  diceValue: null,
  possibleMoves: [],
  currentQuestion: null,
  language: 'da',
  turnStartTime: 0,
  winnerId: null,
  showWedgeConfetti: false,
};

const App: React.FC = () => {
  // State
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isRolling, setIsRolling] = useState(false);
  
  // Setup State
  const [numPlayers, setNumPlayers] = useState(2);
  const [hasAI, setHasAI] = useState(false);
  const [playerConfigs, setPlayerConfigs] = useState<{name: string, difficulty: AIDifficulty}[]>([]);

  const resetGame = () => {
    setGameState(initialState);
    setNumPlayers(2);
    setHasAI(false);
    setPlayerConfigs([]);
    setIsRolling(false);
  };

  // -- SETUP HANDLERS --

  const proceedToDetails = () => {
    const configs = [];
    for(let i=0; i<numPlayers; i++) {
      configs.push({
        name: `Spiller ${i+1}`,
        difficulty: AIDifficulty.ON_AND_ON // Default
      });
    }
    // If AI selected, force last config to be AI (handled in startGame)
    if(hasAI && numPlayers < 6) {
       configs.push({
         name: 'Computer',
         difficulty: AIDifficulty.ON_AND_ON
       });
    }
    setPlayerConfigs(configs);
    setGameState(p => ({...p, phase: GamePhase.SETUP_DETAILS}));
  };

  const updatePlayerConfig = (index: number, field: 'name' | 'difficulty', value: any) => {
    const newConfigs = [...playerConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setPlayerConfigs(newConfigs);
  };

  const startGame = () => {
    // Determine actual number of players based on config length
    const totalPlayers = playerConfigs.length;
    const randomStartIdx = Math.floor(Math.random() * totalPlayers);

    const newPlayers: Player[] = playerConfigs.map((cfg, index) => {
      const isAIPlayer = hasAI && index === playerConfigs.length - 1;
      return {
        id: index,
        isAI: isAIPlayer,
        name: cfg.name,
        difficulty: cfg.difficulty,
        color: isAIPlayer ? '#a855f7' : PLAYER_COLORS[index % PLAYER_COLORS.length],
        positionNodeId: 0,
        wedges: [],
        totalTimeMs: 0
      };
    });

    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      currentPlayerIndex: randomStartIdx,
      phase: GamePhase.ROLL_DICE,
      turnStartTime: Date.now()
    }));
  };

  // -- GAMEPLAY HANDLERS --

  const rollDice = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    
    // Play animation for 1s
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      
      setGameState(prev => {
        const currentPlayer = prev.players[prev.currentPlayerIndex];
        const reachable = getReachableNodes(currentPlayer.positionNodeId, roll);
        
        return {
          ...prev,
          diceValue: roll,
          possibleMoves: reachable,
          phase: GamePhase.MOVE_TOKEN
        };
      });
      setIsRolling(false);
    }, 1000);
  }, [isRolling]);

  const handleNodeClick = async (nodeId: number) => {
    // Strict Validation: Can only click nodes in possibleMoves
    if (!gameState.possibleMoves.includes(nodeId)) return;

    const node = BOARD_NODES.find(n => n.id === nodeId);
    if (!node) return;

    // Update Position
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex].positionNodeId = nodeId;

    // Handle ROLL AGAIN
    if (node.category === CategoryType.ROLL_AGAIN) {
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        possibleMoves: [],
        phase: GamePhase.ROLL_DICE,
        diceValue: null, 
      }));
      // AI loop will catch this phase change
      return;
    }

    // Prepare Question
    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      possibleMoves: [],
      phase: GamePhase.ANSWER_QUESTION,
      currentQuestion: null, // clear old
    }));

    // Fetch
    const playerDiff = updatedPlayers[gameState.currentPlayerIndex].difficulty;
    const q = await generateQuestion(node.category, gameState.language, playerDiff);
    
    setGameState(prev => ({
      ...prev,
      currentQuestion: q
    }));
  };

  const handleAnswer = (correct: boolean) => {
    setGameState(prev => {
      const updatedPlayers = [...prev.players];
      const currIdx = prev.currentPlayerIndex;
      const currPlayer = updatedPlayers[currIdx];
      const currentNode = BOARD_NODES.find(n => n.id === currPlayer.positionNodeId);

      // Stats
      updatedPlayers[currIdx].totalTimeMs += (Date.now() - prev.turnStartTime);
      
      let wedgeWon = false;
      let winnerId = null;
      let nextPhase = GamePhase.ROLL_DICE;
      let nextPlayerIdx = currIdx;
      let showConfetti = false;

      if (correct) {
        // Check Wedge
        if (currentNode?.isWedgeHQ && !currPlayer.wedges.includes(currentNode.category)) {
          currPlayer.wedges.push(currentNode.category);
          wedgeWon = true;
          showConfetti = true;
        }

        // Check Win
        if (currPlayer.wedges.length >= 6) {
           nextPhase = GamePhase.GAME_OVER;
           winnerId = currPlayer.id;
        } else {
           // Correct answer -> Same player rolls again
           nextPhase = GamePhase.ROLL_DICE;
        }
      } else {
        // Incorrect -> Next player
        nextPlayerIdx = (currIdx + 1) % prev.players.length;
        nextPhase = GamePhase.ROLL_DICE;
      }

      return {
        ...prev,
        players: updatedPlayers,
        phase: nextPhase,
        currentPlayerIndex: nextPlayerIdx,
        winnerId: winnerId,
        diceValue: null, // Reset dice so it can be rolled again
        currentQuestion: null,
        turnStartTime: Date.now(), // Reset timer for next turn
        showWedgeConfetti: showConfetti
      };
    });

    // Hide confetti after delay
    setTimeout(() => {
      setGameState(p => ({...p, showWedgeConfetti: false}));
    }, 4000);
  };

  // AI TURN AUTOMATION
  useEffect(() => {
    // Only act if game is active
    if (gameState.phase === GamePhase.GAME_OVER) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    if (gameState.phase === GamePhase.ROLL_DICE && !isRolling) {
      timeoutId = setTimeout(() => {
        rollDice();
      }, 1500);
    } else if (gameState.phase === GamePhase.MOVE_TOKEN) {
      timeoutId = setTimeout(() => {
        const moves = gameState.possibleMoves;
        if (moves.length > 0) {
           // Smart-ish AI: Prefer Wedge HQ if needed, or Roll Again
           const bestMove = moves.find(id => {
             const n = BOARD_NODES.find(node => node.id === id);
             if (n?.category === CategoryType.ROLL_AGAIN) return true;
             if (n?.isWedgeHQ && !currentPlayer.wedges.includes(n.category)) return true;
             return false;
           });
           const target = bestMove || moves[Math.floor(Math.random() * moves.length)];
           handleNodeClick(target);
        } else {
           // Stuck? Shouldn't happen with logic, but failsafe to next player
           handleAnswer(false); 
        }
      }, 2000);
    }

    return () => clearTimeout(timeoutId);
  }, [gameState.phase, gameState.currentPlayerIndex, gameState.possibleMoves, rollDice, isRolling]);

  // -- RENDER --

  if (gameState.phase === GamePhase.SETUP_COUNT) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-600">
            {TEXTS.setupTitle[gameState.language]}
          </h1>
          
          <div className="space-y-6">
             <div className="flex justify-center space-x-4 mb-6">
              <button onClick={() => setGameState(p => ({...p, language: 'da'}))} className={`px-3 py-1 rounded ${gameState.language === 'da' ? 'bg-blue-600' : 'bg-gray-700'}`}>🇩🇰 Dansk</button>
              <button onClick={() => setGameState(p => ({...p, language: 'en'}))} className={`px-3 py-1 rounded ${gameState.language === 'en' ? 'bg-blue-600' : 'bg-gray-700'}`}>🇬🇧 English</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">{TEXTS.numPlayers[gameState.language]}</label>
              <select value={numPlayers} onChange={(e) => setNumPlayers(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-3 outline-none">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {numPlayers < 6 && (
              <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                 <label className="text-gray-300 cursor-pointer" htmlFor="ai-check">{TEXTS.addAI[gameState.language]}</label>
                 <input 
                   id="ai-check"
                   type="checkbox" 
                   checked={hasAI} 
                   onChange={(e) => setHasAI(e.target.checked)} 
                   className="w-6 h-6 rounded text-blue-600 focus:ring-blue-500 bg-gray-600 border-gray-500" 
                 />
              </div>
            )}
            <button onClick={proceedToDetails} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl">
              {TEXTS.nextPlayer[gameState.language]} &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === GamePhase.SETUP_DETAILS) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-white overflow-y-auto">
        <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 my-8">
          <h2 className="text-2xl font-bold text-center mb-6">{TEXTS.playerDetails[gameState.language]}</h2>
          
          <div className="space-y-4">
            {playerConfigs.map((cfg, idx) => {
              const isAIPlayer = hasAI && idx === playerConfigs.length - 1;
              return (
                <div key={idx} className="bg-gray-700/50 p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-center border border-gray-600">
                   <div className="w-8 h-8 rounded-full flex-shrink-0 shadow-md" style={{backgroundColor: isAIPlayer ? '#a855f7' : PLAYER_COLORS[idx % PLAYER_COLORS.length]}}></div>
                   <div className="flex-grow w-full">
                      <label className="text-xs text-gray-400 block">{isAIPlayer ? 'Computer' : `${TEXTS.name[gameState.language]}`}</label>
                      <input 
                        type="text" 
                        value={cfg.name}
                        disabled={isAIPlayer}
                        onChange={(e) => updatePlayerConfig(idx, 'name', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mt-1 focus:border-blue-500 outline-none"
                      />
                   </div>
                   <div className="w-full sm:w-48">
                      <label className="text-xs text-gray-400 block">{TEXTS.aiDifficulty[gameState.language]}</label>
                      <select 
                        value={cfg.difficulty}
                        onChange={(e) => updatePlayerConfig(idx, 'difficulty', Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mt-1 focus:border-blue-500 outline-none"
                      >
                        <option value={AIDifficulty.WALK_IN_THE_PARK}>{TEXTS.diffEasy[gameState.language]}</option>
                        <option value={AIDifficulty.ON_AND_ON}>{TEXTS.diffMed[gameState.language]}</option>
                        <option value={AIDifficulty.UNBEATABLE}>{TEXTS.diffHard[gameState.language]}</option>
                      </select>
                   </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-4">
            <button onClick={() => setGameState(p => ({...p, phase: GamePhase.SETUP_COUNT}))} className="w-1/3 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition">
               &larr; Back
            </button>
            <button onClick={startGame} className="w-2/3 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition">
              {TEXTS.startGame[gameState.language]}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="h-screen w-full relative bg-gray-900 overflow-hidden flex flex-col font-sans">
      {/* Global Confetti for special events */}
      {(gameState.phase === GamePhase.GAME_OVER || gameState.showWedgeConfetti) && <Confetti />}

      {/* Game Over Modal */}
      {gameState.phase === GamePhase.GAME_OVER && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
             <div className="text-center animate-bounce-slow max-w-2xl w-full">
               <h1 className="text-6xl font-bold text-yellow-400 mb-4 drop-shadow-lg">{TEXTS.gameOver[gameState.language]}</h1>
               <h2 className="text-3xl text-white mb-8">{TEXTS.winner[gameState.language]}: {gameState.players.find(p => p.id === gameState.winnerId)?.name}</h2>
               
               <div className="bg-gray-800 p-6 rounded-xl mb-8 mx-auto border border-gray-700">
                 <h3 className="text-xl text-gray-400 mb-4 uppercase tracking-wider">{TEXTS.stats[gameState.language]}</h3>
                 {gameState.players.map(p => (
                   <div key={p.id} className="flex justify-between border-b border-gray-700 py-3 last:border-0">
                     <span className="font-bold" style={{color: p.color}}>{p.name}</span>
                     <span className="font-mono">{Math.round(p.totalTimeMs / 1000)}s</span>
                   </div>
                 ))}
               </div>

               <button 
                 onClick={resetGame}
                 className="bg-white text-black font-bold py-4 px-10 rounded-full hover:bg-gray-200 transition transform hover:scale-110 shadow-xl"
               >
                 {TEXTS.newGame[gameState.language]}
               </button>
             </div>
        </div>
      )}

      {/* 3D Game Board */}
      <div className="flex-grow relative flex items-center justify-center">
        <GameBoard 
          players={gameState.players} 
          currentPlayerId={currentPlayer.id}
          validMoveNodeIds={gameState.possibleMoves}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* HUD Layer */}
      <div className="absolute top-0 left-0 w-full pointer-events-none h-full">
        
        {/* Dice - Top Center */}
        {(gameState.phase === GamePhase.ROLL_DICE || gameState.phase === GamePhase.MOVE_TOKEN) && (
          <div className="pointer-events-auto">
            <Dice 
              value={isRolling ? null : gameState.diceValue} 
              rolling={isRolling} 
              onRoll={rollDice} 
              disabled={gameState.phase !== GamePhase.ROLL_DICE || currentPlayer.isAI || isRolling}
              label={gameState.phase === GamePhase.ROLL_DICE && !isRolling ? TEXTS.rollDice[gameState.language] : ''}
            />
          </div>
        )}

        {/* Player List - Top Left */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-gray-700 pointer-events-auto max-h-[60vh] overflow-y-auto w-48 shadow-lg">
          {gameState.players.map(p => (
             <div key={p.id} className={`flex items-center gap-2 mb-2 p-2 rounded-lg transition-all ${p.id === currentPlayer.id ? 'bg-white/10 font-bold ring-1 ring-white/50' : 'opacity-60 grayscale-[0.3]'}`}>
               <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: p.color}}></div>
               <div className="flex flex-col min-w-0">
                 <span className="text-xs truncate">{p.name}</span>
                 <div className="flex gap-0.5 mt-1">
                   {p.wedges.map((w, i) => (
                     <div key={i} className="w-1.5 h-1.5 rounded-full border border-black/20" style={{backgroundColor: CATEGORY_COLORS[w]}} />
                   ))}
                 </div>
               </div>
             </div>
          ))}
        </div>
        
        {/* Current Status - Top Right */}
        <div className="absolute top-4 right-4 pointer-events-auto w-64 px-4">
            <div className="bg-black/70 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl text-center transform transition-all">
               <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">{TEXTS.activePlayer[gameState.language]}</div>
               <div className="text-xl font-black tracking-tight mb-1" style={{color: currentPlayer.color}}>{currentPlayer.name}</div>
               <div className="text-sm font-medium text-white/90">
                  {gameState.phase === GamePhase.ROLL_DICE && (currentPlayer.isAI ? TEXTS.aiThinking[gameState.language] : (isRolling ? 'Rolling...' : TEXTS.rollDice[gameState.language]))}
                  {gameState.phase === GamePhase.MOVE_TOKEN && (currentPlayer.isAI ? TEXTS.aiThinking[gameState.language] : TEXTS.moveInstruction[gameState.language])}
                  {gameState.phase === GamePhase.ANSWER_QUESTION && (currentPlayer.isAI ? TEXTS.aiThinking[gameState.language] : "...")}
               </div>
            </div>
        </div>
      </div>

      {/* Question Modal Overlay */}
      {gameState.currentQuestion && (
        <QuestionModal 
          question={gameState.currentQuestion}
          onAnswer={handleAnswer}
          category={gameState.currentQuestion.category}
          language={gameState.language}
          isAI={currentPlayer.isAI}
          aiProbability={currentPlayer.difficulty}
          playerName={currentPlayer.name}
        />
      )}
    </div>
  );
};

export default App;
