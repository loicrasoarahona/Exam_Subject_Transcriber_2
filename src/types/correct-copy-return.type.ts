export type CorrectCopyReturnType = {
  sections: section[];
  student_name: string;
  note_finale: number;
  note_sur: number;
};

type section = {
  theme: string;
  questions: question[];
  total: number;
};

type question = {
  question_number: string;
  score: number;
};
