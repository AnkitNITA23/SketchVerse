'use server';

/**
 * @fileOverview Analyzes player guesses in a drawing game and provides hints.
 *
 * - analyzeGuess - A function that takes the current drawing description and recent guesses, and provides a helpful hint.
 * - AnalyzeGuessInput - The input type for the analyzeGuess function.
 * - AnalyzeGuessOutput - The return type for the analyzeGuess function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeGuessInputSchema = z.object({
  drawingDescription: z
    .string()
    .describe('A description of the current drawing on the canvas.'),
  recentGuesses: z
    .array(z.string())
    .describe('An array of recent guesses made by players.'),
});
export type AnalyzeGuessInput = z.infer<typeof AnalyzeGuessInputSchema>;

const AnalyzeGuessOutputSchema = z.object({
  hint: z
    .string()
    .describe(
      'A helpful hint to guide players towards the correct answer, based on the drawing and previous guesses.'
    ),
});
export type AnalyzeGuessOutput = z.infer<typeof AnalyzeGuessOutputSchema>;

export async function analyzeGuess(input: AnalyzeGuessInput): Promise<AnalyzeGuessOutput> {
  return analyzeGuessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeGuessPrompt',
  input: {schema: AnalyzeGuessInputSchema},
  output: {schema: AnalyzeGuessOutputSchema},
  prompt: `You are assisting players in a drawing and guessing game.
  The current drawing is described as: {{{drawingDescription}}}.
  Recent guesses include: {{#each recentGuesses}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.

  Based on the drawing and the guesses so far, provide a single helpful hint to guide the players. The hint should not directly reveal the answer but nudge them in the right direction. Make the hint creative.
  Hint:`,
});

const analyzeGuessFlow = ai.defineFlow(
  {
    name: 'analyzeGuessFlow',
    inputSchema: AnalyzeGuessInputSchema,
    outputSchema: AnalyzeGuessOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      hint: output!,
    };
  }
);
