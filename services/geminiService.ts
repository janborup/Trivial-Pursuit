
import { GoogleGenAI, Type } from "@google/genai";
import { CategoryType, Question, AIDifficulty } from "../types";
import { TEXTS } from "../constants";

// NOTE: In a real environment, secure this key. For this demo, we assume process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestion = async (
  category: CategoryType, 
  language: 'da' | 'en',
  difficulty: AIDifficulty
): Promise<Question> => {
  // Fallback/Hub maps to a random category effectively
  const activeCategory = category === CategoryType.HUB ? CategoryType.GEOGRAPHY : category;
  
  const categoryName = language === 'da' ? TEXTS[getCategoryKey(activeCategory)].da : TEXTS[getCategoryKey(activeCategory)].en;
  const langName = language === 'da' ? 'Danish' : 'English';
  
  let difficultyText = "medium";
  if (difficulty === AIDifficulty.WALK_IN_THE_PARK) difficultyText = "easy (for children)";
  if (difficulty === AIDifficulty.UNBEATABLE) difficultyText = "very hard (expert level)";

  const prompt = `Generate a ${difficultyText} Trivial Pursuit question for the category: ${categoryName}. Language: ${langName}.
  Provide 1 correct answer and 5 incorrect answers. The answers should be short (1-4 words).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            incorrectAnswers: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
            },
          },
          required: ['question', 'correctAnswer', 'incorrectAnswers'],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);
    
    // Shuffle options
    const allOptions = [data.correctAnswer, ...data.incorrectAnswers];
    const shuffled = allOptions
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    const correctIndex = shuffled.indexOf(data.correctAnswer);

    return {
      category: activeCategory,
      text: data.question,
      options: shuffled,
      correctOptionIndex: correctIndex
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback if API fails
    return {
      category: activeCategory,
      text: language === 'da' 
        ? "Kunne ikke hente spørgsmål. Prøv igen." 
        : "Could not fetch question. Try again.",
      options: ["OK", "-", "-", "-", "-", "-"],
      correctOptionIndex: 0
    };
  }
};

const getCategoryKey = (cat: CategoryType): string => {
  switch (cat) {
    case CategoryType.GEOGRAPHY: return 'geo';
    case CategoryType.ENTERTAINMENT: return 'ent';
    case CategoryType.HISTORY: return 'hist';
    case CategoryType.ART_LITERATURE: return 'art';
    case CategoryType.SCIENCE_NATURE: return 'sci';
    case CategoryType.SPORT_LEISURE: return 'sport';
    default: return 'geo';
  }
};
