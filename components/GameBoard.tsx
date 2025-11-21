
import React from 'react';
import { BoardNode, CategoryType, Player } from '../types';
import { BOARD_NODES, CATEGORY_COLORS } from '../constants';

interface GameBoardProps {
  players: Player[];
  currentPlayerId: number;
  validMoveNodeIds: number[];
  onNodeClick: (nodeId: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ players, currentPlayerId, validMoveNodeIds, onNodeClick }) => {
  
  return (
    <div className="perspective-container w-full h-full flex items-center justify-center overflow-hidden bg-gray-900 relative select-none">
      {/* Table surface illusion */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black opacity-80"></div>

      {/* 
         Board Size: 
         The logic uses 0-100% coordinates. 
         Radius is approx 6 * 7 = 42%.
         We need slightly more padding. 
      */}
      <div className="board-3d relative w-[95vmin] h-[95vmin] max-w-[800px] max-h-[800px] rounded-full border-[12px] border-gray-800 bg-black shadow-2xl">
        
        {/* Hub Display */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] rounded-full bg-gray-200 z-10 flex items-center justify-center shadow-lg border-4 border-gray-400">
           <div className="text-gray-600 font-bold text-[1.5vmin]">TRIVIA</div>
        </div>

        {/* Render Nodes */}
        {BOARD_NODES.map((node) => {
           const isValidMove = validMoveNodeIds.includes(node.id);
           
           // Scale sizes based on node type
           // HQs are large circles. Normal nodes are smaller squares. Hub is handled above (but node 0 still needs to be clickable if valid).
           const isHub = node.id === 0;
           const isHQ = node.isWedgeHQ;
           
           // Base size unit
           const baseSize = 5; // percent
           const width = isHub ? 15 : (isHQ ? 7 : 4.5);
           const height = isHub ? 15 : (isHQ ? 7 : 4.5);
           
           const zIndex = isHub ? 10 : 5;
           
           return (
             <div
               key={node.id}
               onClick={() => isValidMove && onNodeClick(node.id)}
               className={`absolute flex items-center justify-center transition-all duration-300
                 ${isHub ? 'rounded-full opacity-0' : '' /* Invisible click target for hub over visual hub */}
                 ${isHQ ? 'rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'rounded-sm border border-gray-700 shadow-sm'}
                 ${isValidMove ? 'ring-4 ring-white cursor-pointer animate-pulse z-50 scale-125' : ''}
                 ${node.category === CategoryType.ROLL_AGAIN ? 'border-white/50' : ''}
               `}
               style={{
                 backgroundColor: CATEGORY_COLORS[node.category],
                 width: `${width}%`,
                 height: `${height}%`,
                 left: `calc(${node.x}% - ${width/2}%)`,
                 top: `calc(${node.y}% - ${height/2}%)`,
                 zIndex: zIndex,
               }}
             >
               {/* Wedge placeholders for HQs */}
               {node.isWedgeHQ && (
                 <div className="w-[30%] h-[30%] bg-black/20 rounded-full"></div>
               )}
               {/* Roll Again Icon */}
               {node.category === CategoryType.ROLL_AGAIN && (
                 <div className="text-[0.6rem] text-white font-bold text-center leading-none">
                    🎲
                 </div>
               )}
             </div>
           );
        })}

        {/* Render Players */}
        {players.map((player, index) => {
          const node = BOARD_NODES.find(n => n.id === player.positionNodeId);
          if (!node) return null;

          const isActive = player.id === currentPlayerId;
          // Offset slightly if multiple players on same node
          const offset = index * 3; 

          return (
            <div
              key={player.id}
              className={`token absolute rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all duration-500 ${isActive ? 'z-50 scale-125' : 'z-40'}`}
              style={{
                backgroundColor: player.color,
                width: `4%`,
                height: `4%`,
                left: `calc(${node.x}% - 2% + ${offset}px)`,
                top: `calc(${node.y}% - 2% - ${offset}px)`, // Lift up and offset
              }}
            >
              {/* Wedges Display (Floating above player) */}
              <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 flex gap-0.5 whitespace-nowrap pointer-events-none">
                 {player.wedges.map((w, i) => (
                   <div key={i} className="w-1.5 h-1.5 rounded-full border border-black" style={{backgroundColor: CATEGORY_COLORS[w]}} />
                 ))}
              </div>

              {isActive && (
                 <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    {player.name}
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;
