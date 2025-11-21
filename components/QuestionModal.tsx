
import React, { useState, useEffect } from 'react';
import { CategoryType, Question } from '../types';
import { CATEGORY_COLORS, TEXTS } from '../constants';

interface QuestionModalProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
  category: CategoryType;
  language: 'da' | 'en';
  isAI: boolean;
  aiProbability: number; // 30, 50, 80
  playerName: string;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ question, onAnswer, category, language, isAI, aiProbability, playerName }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');

  useEffect(() => {
    if (isAI) {
      setAiStatus(TEXTS.aiThinking[language]);
      const timer = setTimeout(() => {
        // AI Logic
        const roll = Math.random() * 100;
        const isCorrect = roll <= aiProbability;
        
        let chosenIndex;
        if (isCorrect) {
          chosenIndex = question.correctOptionIndex;
        } else {
          // Pick a random wrong answer
          const wrongIndices = question.options.map((_, i) => i).filter(i => i !== question.correctOptionIndex);
          chosenIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
        }
        
        setSelectedOption(chosenIndex);
        setRevealed(true);
        setAiStatus(isCorrect ? TEXTS.correct[language] : TEXTS.wrong[language]);

        setTimeout(() => {
          onAnswer(isCorrect);
        }, 2000);

      }, 3000); // 3s thinking time

      return () => clearTimeout(timer);
    }
  }, [isAI, aiProbability, question, onAnswer, language]);

  const handleOptionClick = (index: number) => {
    if (revealed || isAI) return; // Block input if AI or already answered
    
    setSelectedOption(index);
    setRevealed(true);

    const isCorrect = index === question.correctOptionIndex;
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 2000); // Show result for 2s
  };

  const getCategoryName = () => {
     if(category === CategoryType.GEOGRAPHY) return TEXTS.geo[language];
     if(category === CategoryType.ENTERTAINMENT) return TEXTS.ent[language];
     if(category === CategoryType.HISTORY) return TEXTS.hist[language];
     if(category === CategoryType.ART_LITERATURE) return TEXTS.art[language];
     if(category === CategoryType.SCIENCE_NATURE) return TEXTS.sci[language];
     if(category === CategoryType.SPORT_LEISURE) return TEXTS.sport[language];
     return TEXTS.category[language];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div 
          className="p-6 text-white text-center shadow-md"
          style={{ backgroundColor: CATEGORY_COLORS[category] || '#6b7280' }}
        >
          <h2 className="text-2xl font-bold uppercase tracking-wider">
            {playerName} - {getCategoryName()}
          </h2>
          {isAI && <p className="mt-2 text-white/90 font-mono animate-pulse">{aiStatus}</p>}
        </div>

        {/* Question */}
        <div className="p-8">
          <p className="text-xl text-gray-800 font-medium text-center mb-8 leading-relaxed">
            {question.text}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {question.options.map((opt, idx) => {
              let btnClass = "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200";
              
              if (revealed) {
                if (idx === question.correctOptionIndex) {
                  btnClass = "bg-green-500 text-white border-green-600 shadow-lg scale-[1.02]";
                } else if (idx === selectedOption) {
                  btnClass = "bg-red-500 text-white border-red-600";
                } else {
                  btnClass = "opacity-50 bg-gray-100";
                }
              } else if (selectedOption === idx) {
                btnClass = "bg-blue-500 text-white";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  disabled={revealed || isAI}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all duration-200 ${btnClass}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
