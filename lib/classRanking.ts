import type {
  ClassRoom,
  ResultEntry,
  Student,
  Subject,
  SchoolLevel,
} from "@/lib/types";

function getClassLevel(
  classroom: ClassRoom
): SchoolLevel | "" {
  const value = `${classroom.level || ""} ${classroom.name || ""}`
    .toLowerCase();

  if (value.includes("pre nursery") || value.includes("pre-nursery") || value.includes("prenursery")) return "pre-nursery";
  if (value.includes("nursery")) return "nursery";
  if (value.includes("primary")) return "primary";
  if (value.includes("jss") || value.includes("junior")) return "jss";
  if (value.startsWith("ss") || value.includes("senior")) return "ss";

  return "";
}

export function getMainSubjectsForClass(
  classroom: ClassRoom,
  subjects: Subject[]
): Subject[] {
  const level = getClassLevel(classroom);

  return subjects.filter((subject) => {
    const name = subject.name.trim().toLowerCase();

    if (name === "music") return false;

    if (
      subject.section === "arabic" ||
      subject.scoringType === "arabic-40-60"
    ) {
      return false;
    }

    if (!level) return true;

    if (Array.isArray(subject.levels) && subject.levels.length > 0) {
      return subject.levels.includes(level);
    }

    return true;
  });
}

export function calculateClassPositions(
  students: Student[],
  results: ResultEntry[],
  requiredSubjects: Subject[]
): Map<string, number | null> {
  const positions = new Map<string, number | null>();

  if (requiredSubjects.length === 0) {
    students.forEach((student) => positions.set(student.id, null));
    return positions;
  }

  const completed: {
    studentId: string;
    average: number;
  }[] = [];

  students.forEach((student) => {
    const studentResults = results.filter(
      (result) => result.studentId === student.id
    );

    const subjectTotals = requiredSubjects.map((subject) => {
      const result = studentResults.find(
        (item) => item.subjectId === subject.id
      );

      if (
        !result ||
        result.total === undefined ||
        result.total === null ||
        !Number.isFinite(Number(result.total))
      ) {
        return null;
      }

      return Number(result.total);
    });

    // Do not rank students with missing Main-subject results.
    if (subjectTotals.some((total) => total === null)) {
      positions.set(student.id, null);
      return;
    }

    const total = subjectTotals.reduce(
      (sum, score) => sum + (score ?? 0),
      0
    );

    completed.push({
      studentId: student.id,
      average: Number((total / requiredSubjects.length).toFixed(2)),
    });
  });

  completed.sort((a, b) => b.average - a.average);

  let previousAverage: number | null = null;
  let currentPosition = 0;

  completed.forEach((entry, index) => {
    if (previousAverage === null || entry.average !== previousAverage) {
      currentPosition = index + 1;
    }

    positions.set(entry.studentId, currentPosition);
    previousAverage = entry.average;
  });

  return positions;
}

export function formatPosition(position: number | null | undefined): string {
  if (position === null || position === undefined) return "Pending";

  const remainder100 = position % 100;

  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1: return `${position}st`;
    case 2: return `${position}nd`;
    case 3: return `${position}rd`;
    default: return `${position}th`;
  }
}