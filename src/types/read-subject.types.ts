export type Question = {
  question_number: string;
  statement: string;
  question_type: string;
  points: number;
  excepted_answer: string;
};

export type Section = {
  theme: string;
  questions: Question[];
};

export type SubjectAnalysis = {
  subject: string;
  sections: Section[];
};

export type PartialCreditCriterion = {
  criterion: string;
  points: number;
};

export type ExtractedQuestion = {
  questionNumber: string;
  printedNumber: string;
  statement: string;
  questionType: string;
  points: number;
  context: string | null;
  figure: string | null;
  expectedAnswer: string;
  partialCredit: PartialCreditCriterion[];
  needsReview: boolean;
  options?: string[];
};

export type ExtractedSection = {
  order: number;
  sectionCode: string;
  theme: string;
  declaredPoints: number | null;
  context: string | null;
  questions: ExtractedQuestion[];
};

export type SubjectExtraction = {
  discipline: string;
  sections: ExtractedSection[];
  warnings: string[];
};
