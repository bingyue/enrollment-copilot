import leadAnalysis from './lead-analysis';
import studentProfile from './student-profile';
import courseMatching from './course-matching';
import objectionHandling from './objection-handling';
import leadScoring from './lead-scoring';
import nextBestAction from './next-best-action';
import followUpPlan from './follow-up-plan';
import studentOperation from './student-operation';
export const salesPrompt = [
  leadAnalysis,
  studentProfile,
  courseMatching,
  objectionHandling,
  leadScoring,
  nextBestAction,
  followUpPlan,
].join('\n\n');
export { studentOperation };
