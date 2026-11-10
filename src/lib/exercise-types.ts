export type Widget =
  | "choice"
  | "multi"
  | "set"
  | "table"
  | "tokens"
  | "sequence"
  | "grammar"
  | "tree"
  | "parts"
  | "open";
export type ExerciseBody = {
  title: string;
  titleEn: string;
  statement: string;
  statementEn: string;
  widget: Widget;
  grammar?: string;
  input?: string;
  target?: string;
  direction?: "left" | "right";
  options?: string[];
  fields?: string[];
  expected: unknown;
  hints: string[];
  explanation: string;
  explanationEn: string;
  rubric: string;
  objective: string;
  prerequisites: string[];
  variant?: string;
};
export type PublicExercise = Omit<
  ExerciseBody,
  "expected" | "explanation" | "explanationEn"
> & {
  id: string;
  topic: string;
  type: string;
  difficulty: number;
  provenance: string;
};
export type Feedback = {
  score: number | null;
  correct: boolean;
  status: "scored" | "needs_manual_review";
  expected: unknown;
  missing: string[];
  extra: string[];
  why: string;
  rubric: string;
  answer: unknown;
};
