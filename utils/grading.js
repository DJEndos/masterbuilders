/**
 * Standard Nigerian secondary/primary school grading scale (out of 100).
 * Adjust boundaries here if the school's academic board prefers different cutoffs.
 */
const GRADE_SCALE = [
  { min: 75, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 65, max: 74, grade: 'B2', remark: 'Very Good' },
  { min: 60, max: 64, grade: 'B3', remark: 'Good' },
  { min: 55, max: 59, grade: 'C4', remark: 'Credit' },
  { min: 50, max: 54, grade: 'C5', remark: 'Credit' },
  { min: 45, max: 49, grade: 'C6', remark: 'Credit' },
  { min: 40, max: 44, grade: 'D7', remark: 'Pass' },
  { min: 30, max: 39, grade: 'E8', remark: 'Weak Pass' },
  { min: 0, max: 29, grade: 'F9', remark: 'Fail' }
];

function computeGrade(total) {
  const band = GRADE_SCALE.find((b) => total >= b.min && total <= b.max) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: band.grade, remark: band.remark };
}

function computeSubjectTotal(ca1 = 0, ca2 = 0, exam = 0) {
  const total = Number(ca1) + Number(ca2) + Number(exam);
  const { grade, remark } = computeGrade(total);
  return { total, grade, remark };
}

/**
 * Adds ordinal suffix to a number position, e.g. 1 -> "1st", 22 -> "22nd"
 */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = { computeGrade, computeSubjectTotal, ordinal, GRADE_SCALE };
