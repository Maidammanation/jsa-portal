// lib/grading.ts
// Simple Nigerian-style grading helper: CA1 + CA2 + Exam = Total /100.
// Adjust the boundaries below to match the school's actual grading policy.

export function computeTotal(ca1 = 0, ca2 = 0, exam = 0): number {
  return ca1 + ca2 + exam;
}

export function computeGrade(total: number): string {
  if (total >= 75) return "A";
  if (total >= 65) return "B";
  if (total >= 55) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

export function computeRemark(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Fair";
    case "E":
      return "Pass";
    default:
      return "Fail";
  }
}
