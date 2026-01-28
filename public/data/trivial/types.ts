/**
 * TypeScript interfaces for Trivial trivia questions
 */

export interface TriviaQuestion {
  id: string
  question: string
  answer: string
  options: string[]
  difficulty: "easy" | "medium" | "hard"
  reference: string
  explanation?: string
}

export interface TriviaCategoryData {
  category: string
  name: string
  questions: TriviaQuestion[]
}

export type CategoryId = 
  | "general"
  | "science"
  | "history"
  | "geography"
  | "entertainment"
  | "sports"
  | "technology"
  | "literature"
  | "food"
  | "animals"
