import type { ExamCopyAttributes } from "./ExamCopyTypes.js";

export interface DisciplineAttributes {
  id?: number;
  name?: string;
}

export interface ExamSubjectAttributes {
  id?: number;
  filename?: string;
  analysis?: ExamSubjectAnalysisAttributes;
  examCopies?: ExamCopyAttributes[];
  disciplineId?: number;
  discipline?: DisciplineAttributes;
  description?: string;
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
  declaredPoints?: number;
  context?: string;
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
  context?: string;
  figure?: string;
  expectedAnswer?: string;
  partialCredit?: PartialCreditCriterionAttributes[];
  needsReview?: boolean;
  options?: string[];
}
