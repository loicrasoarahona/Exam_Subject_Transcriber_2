export type CorrectCopyReturnType = {
  studentName: string;
  sections: section[];
};

type section = {
  sectionCode: string;
  questions: question[];
};

type question = {
  questionNumber: string;
  score: number;
  needsReview: boolean;
  comment: string | null;
};
