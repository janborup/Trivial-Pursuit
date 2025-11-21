
import React from 'react';

interface DiceProps {
  value: number | null;
  rolling: boolean;
  onRoll: () => void;
  disabled: boolean;
  label: string;
}

const Dice: React.FC<DiceProps> = ({ value, rolling, onRoll, disabled, label }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
      <button
        onClick={onRoll}
        disabled={disabled || rolling}
        className={`
          w-16 h-16 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transform transition-all duration-300 border-2
          flex items-center justify-center text-3xl font-bold text-gray-900
          ${disabled ? 'bg-gray-300 cursor-not-allowed opacity-50 grayscale' : 'bg-white hover:scale-110 active:scale-95 cursor-pointer border-blue-500'}
          ${rolling ? 'animate-shake bg-yellow-100 border-yellow-500' : 'animate-bounce-slow'}
        `}
      >
        {rolling ? (
          <span className="text-2xl opacity-50">🎲</span>
        ) : (
          value ?? <span className="text-2xl">🎲</span>
        )}
      </button>
      {label && (
        <span className="mt-2 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm border border-white/20 animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

export default Dice;
