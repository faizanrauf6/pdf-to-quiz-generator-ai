
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizFeedback {
  selectedAnswer: string;
  isCorrect: boolean;
  correctAnswer: string; // Storing correct answer here for easy display in feedback
}

export type AppState = 'upload' | 'generating' | 'inProgress' | 'completed' | 'error';
