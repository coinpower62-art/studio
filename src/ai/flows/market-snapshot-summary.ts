'use server';
/**
 * @fileOverview This file provides an AI agent for generating brief, easy-to-understand summaries
 * of general market trends and notable investment opportunities.
 *
 * - marketSnapshotSummary - A function that provides a market snapshot summary.
 * - MarketSnapshotSummaryInput - The input type for the marketSnapshotSummary function.
 * - MarketSnapshotSummaryOutput - The return type for the marketSnapshotSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketSnapshotSummaryInputSchema = z.object({
  userPreferences: z
    .string()
    .optional()
    .describe('Optional user preferences to tailor the market summary.'),
});
export type MarketSnapshotSummaryInput = z.infer<
  typeof MarketSnapshotSummaryInputSchema
>;

const MarketSnapshotSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A brief, easy-to-understand summary of general market trends and notable investment opportunities.'
    ),
});
export type MarketSnapshotSummaryOutput = z.infer<
  typeof MarketSnapshotSummaryOutputSchema
>;

export async function marketSnapshotSummary(
  input: MarketSnapshotSummaryInput
): Promise<MarketSnapshotSummaryOutput> {
  return marketSnapshotSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketSnapshotSummaryPrompt',
  input: { schema: MarketSnapshotSummaryInputSchema },
  output: { schema: MarketSnapshotSummaryOutputSchema },
  prompt: `You are an expert financial analyst. Your task is to provide a brief, easy-to-understand summary of current general market trends and highlight notable investment opportunities.

Keep the summary concise and focused on key insights that an investor would find valuable to quickly grasp the market sentiment and potential areas of interest.

{{#if userPreferences}}
Consider the following user preferences when generating the summary: {{{userPreferences}}}
{{/if}}

Provide only the summary in JSON format.`,
});

const marketSnapshotSummaryFlow = ai.defineFlow(
  {
    name: 'marketSnapshotSummaryFlow',
    inputSchema: MarketSnapshotSummaryInputSchema,
    outputSchema: MarketSnapshotSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
