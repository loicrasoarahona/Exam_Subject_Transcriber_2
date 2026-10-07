import type {
  ExamSubjectAttributes,
  ExamSubjectQuestionAttributes,
  ExamSubjectSectionAttributes,
} from "./interfaces.js";

export interface ExamCopyAttributes {
  id?: number;
  filename?: string;
  examSubjectId?: number;
  examSubject?: ExamSubjectAttributes;
  analysis?: ExamCopyAnalysisAttributes;
}

export interface ExamCopyAnalysisAttributes {
  id?: number;
  examCopyId?: number;
  examCopy?: ExamCopyAttributes;
  studentName?: string;
  sectionResults?: ExamCopySectionResultAttributes[];
  totalScore?: number;
  maxScore?: number;
}

export interface ExamCopySectionResultAttributes {
  id?: number;
  copyAnalysisId?: number;
  copyAnalysis?: ExamCopyAnalysisAttributes;
  examSubjectSectionId?: number;
  examSubjectSection?: ExamSubjectSectionAttributes;
  questionResults?: ExamCopyQuestionResultAttributes[];
}

export interface ExamCopyQuestionResultAttributes {
  id?: number;
  sectionResultId?: number;
  sectionResult?: ExamCopySectionResultAttributes;
  examQuestionId?: number;
  examQuestion?: ExamSubjectQuestionAttributes;
  score?: number;
}
