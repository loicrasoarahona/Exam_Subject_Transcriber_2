import type { ExamCopyAttributes } from "./exam-copy.types.js";

export interface DisciplineAttributes {
  id?: number;
  name?: string;
}

export interface ExamSubjectAttributes {
  id?: number;
  filename?: string;
  analysis?: ExamSubjectAnalysisAttributes;
  examCopies?: ExamCopyAttributes[];
  disciplineId?: number | undefined;
  discipline?: DisciplineAttributes;
  description?: string | undefined;
}

export interface ExamSubjectAnalysisAttributes {
  id?: number;
  subjectId?: number;
  subject?: ExamSubjectAttributes;
  description?: string;
  discipline?: string;
  warnings?: string[];
  sections?: ExamSubjectSectionAttributes[];
}

export interface ExamSubjectSectionAttributes {
  id?: number;
  subjectAnalysisId?: number;
  subjectAnalysis?: ExamSubjectAnalysisAttributes;
  order?: number;
  sectionCode?: string;
  theme?: string;
  declaredPoints?: number | null;
  context?: string | null;
  questions?: ExamSubjectQuestionAttributes[];
}

export interface PartialCreditCriterionAttributes {
  criterion: string;
  points: number;
}

export interface ExamSubjectQuestionAttributes {
  id?: number;
  sectionId?: number;
  section?: ExamSubjectSectionAttributes;
  questionNumber?: string;
  printedNumber?: string;
  statement?: string;
  questionType?: string;
  points?: number;
  context?: string | null;
  figure?: string | null;
  expectedAnswer?: string;
  partialCredit?: PartialCreditCriterionAttributes[];
  needsReview?: boolean;
  options?: string[] | undefined;
}
