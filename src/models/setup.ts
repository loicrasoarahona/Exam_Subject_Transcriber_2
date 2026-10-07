import { ExamCopy } from "./exam-copy.model.js";
import { ExamCopyQuestionResult } from "./exam-copy-question-result.model.js";
import { ExamCopySectionResult } from "./exam-copy-section-result.model.js";
import { ExamCopyAnalysis } from "./exam-copy-analysis.model.js";
import { ExamSubject } from "./exam-subject.model.js";
import { ExamSubjectQuestion } from "./exam-subject-question.model.js";
import { ExamSubjectSection } from "./exam-subject-section.model.js";
import { ExamSubjectAnalysis } from "./exam-subject-analysis.model.js";
import { Discipline } from "./discipline.model.js";

function setUpDisciplineToExamSubjectRelation() {
  Discipline.hasMany(ExamSubject, {
    foreignKey: "disciplineId",
    as: "examSubjects",
  });
  ExamSubject.belongsTo(Discipline, {
    foreignKey: "disciplineId",
    as: "discipline",
  });
}

function setupExamSubjectToExamSubjectStatRelation() {
  ExamSubject.hasOne(ExamSubjectAnalysis, {
    foreignKey: "subjectId",
    as: "analysis",
  });
  ExamSubjectAnalysis.belongsTo(ExamSubject, {
    foreignKey: "subjectId",
    as: "subject",
  });
}

function setupExamSubjectStatToExamSubjectSectionRelation() {
  ExamSubjectAnalysis.hasMany(ExamSubjectSection, {
    foreignKey: "subjectAnalysisId",
    as: "sections",
  });
  ExamSubjectSection.belongsTo(ExamSubjectAnalysis, {
    foreignKey: "subjectAnalysisId",
    as: "subjectAnalysis",
  });
}

function setupExamSubjectSectionToExamSubjectQuestionRelation() {
  ExamSubjectSection.hasMany(ExamSubjectQuestion, {
    foreignKey: "sectionId",
    as: "questions",
  });
  ExamSubjectQuestion.belongsTo(ExamSubjectSection, {
    foreignKey: "sectionId",
    as: "section",
  });
}

function setupExamCopyToExamSubjectRelation() {
  ExamSubject.hasMany(ExamCopy, {
    foreignKey: "examSubjectId",
    as: "examCopies",
  });
  ExamCopy.belongsTo(ExamSubject, {
    foreignKey: "examSubjectId",
    as: "examSubject",
  });
}

function setupExamCopyToExamCopyAnalysisRelation() {
  ExamCopy.hasOne(ExamCopyAnalysis, {
    foreignKey: "examCopyId",
    as: "analysis",
  });
  ExamCopyAnalysis.belongsTo(ExamCopy, {
    foreignKey: "examCopyId",
    as: "examCopy",
  });
}

function setupExamCopyAnalysisToExamCopySectionResultRelation() {
  ExamCopyAnalysis.hasMany(ExamCopySectionResult, {
    foreignKey: "copyAnalysisId",
    as: "sectionResults",
  });
  ExamCopySectionResult.belongsTo(ExamCopyAnalysis, {
    foreignKey: "copyAnalysisId",
    as: "copyStat",
  });
}

function setupExamCopySectionResultToExamSubjectSectionRelation() {
  ExamSubjectSection.hasMany(ExamCopySectionResult, {
    foreignKey: "examSubjectSectionId",
  });
  ExamCopySectionResult.belongsTo(ExamSubjectSection, {
    foreignKey: "examSubjectSectionId",
  });
}

function setupExamCopySectionResultToExamCopyQuestionResult() {
  ExamCopySectionResult.hasMany(ExamCopyQuestionResult, {
    foreignKey: "sectionResultId",
    as: "questionResults",
  });
  ExamCopyQuestionResult.belongsTo(ExamCopySectionResult, {
    foreignKey: "sectionResultId",
    as: "examQuestion",
  });
}

function setupExamQuestionToExamCopyQuestionResultRelation() {
  ExamSubjectQuestion.hasMany(ExamCopyQuestionResult, {
    foreignKey: "examQuestionId",
  });
  ExamCopyQuestionResult.belongsTo(ExamSubjectQuestion, {
    foreignKey: "examQuestionId",
  });
}

export function setupModelRelations() {
  setUpDisciplineToExamSubjectRelation();
  setupExamSubjectToExamSubjectStatRelation();
  setupExamSubjectStatToExamSubjectSectionRelation();
  setupExamSubjectSectionToExamSubjectQuestionRelation();
  setupExamCopyToExamSubjectRelation();
  setupExamCopyToExamCopyAnalysisRelation();
  setupExamCopyAnalysisToExamCopySectionResultRelation();
  setupExamCopySectionResultToExamSubjectSectionRelation();
  setupExamCopySectionResultToExamCopyQuestionResult();
  setupExamQuestionToExamCopyQuestionResultRelation();
}
