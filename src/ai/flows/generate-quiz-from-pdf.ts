'use server';

/**
 * @fileOverview Generates a quiz from a PDF document.
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'      
    ),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The four answer options for the question.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated quiz questions and answers.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. You will generate a quiz based on the content of the following PDF document.

PDF Document: {{media url=pdfDataUri}}

The quiz should consist of multiple-choice questions, each with four answer options. For each question, provide the question text, the four answer options, and the correct answer.

Ensure the quiz is comprehensive and covers the key topics in the PDF document.

Output the quiz in the following JSON format:

{
  "quiz": [
    {
      "question": "Question 1 text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "The correct answer"
    },
    {
      "question": "Question 2 text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "The correct answer"
    }
  ]
}
`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
