'use server';

import { analyzeGuess, AnalyzeGuessInput } from '@/ai/flows/ai-guess-analyzer';

export async function getAiHintAction(drawingDescription: string, recentGuesses: string[]): Promise<string> {
  const input: AnalyzeGuessInput = {
    drawingDescription,
    recentGuesses,
  };
  
  if (recentGuesses.length === 0) {
    return "Make a few guesses first and then I can give you a hint!";
  }

  try {
    const result = await analyzeGuess(input);
    return result.hint;
  } catch (error) {
    console.error("Error getting AI hint:", error);
    return "Sorry, I couldn't think of a hint right now. Try guessing again!";
  }
}
