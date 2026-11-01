import type {
  ClassRoom,
  ResultEntry,
  Student,
  Subject,
} from "@/lib/types";

import {
  getClassLevel,
  subjectAppliesToClass,
} from "@/lib/curriculum";

export function getMainSubjectsForClass(
  classroom: ClassRoom,
  subjects: Subject[]
): Subject[] {
  const level = getClassLevel(classroom);

  // Never calculate rankings for an unidentified class level.
  if (!level) {
    return [];
  }

  return subjects.filter((subject) => {
    const name = subject.name.trim().toLowerCase();

    // Music is excluded from result ranking.
    if (name === "music") {
      return false;
    }

    // Arabic is displayed separately and excluded from ranking.
    if (
      subject.section === "arabic" ||
      subject.scoringType === "arabic-40-60"
    ) {
      return false;
    }

    // A subject must explicitly include this class level.
    return subjectAppliesToClass(
      subject.levels,
      level
    );
  });
}

export function calculateClassPositions(
  students: Student[],
  results: ResultEntry[],
  requiredSubjects: Subject[]
): Map<string, number | null> {
  const positions = new Map<string, number | null>();

  if (requiredSubjects.length === 0) {
    students.forEach((student) => {
      positions.set(student.id, null);
    });

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

    const subjectTotals = requiredSubjects.map(
      (subject) => {
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

        const total = Number(result.total);

        if (total < 0 || total > 100) {
          return null;
        }

        return total;
      }
    );

    // Students missing any required Main subject remain Pending.
    if (subjectTotals.some((total) => total === null)) {
      positions.set(student.id, null);
      return;
    }

    const total = subjectTotals.reduce<number>(
      (sum, score) => sum + (score ?? 0),
      0
    );

    completed.push({
      studentId: student.id,
      average: Number(
        (total / requiredSubjects.length).toFixed(2)
      ),
    });
  });

  completed.sort(
    (a, b) => b.average - a.average
  );

  let previousAverage: number | null = null;
  let currentPosition = 0;

  completed.forEach((entry, index) => {
    if (
      previousAverage === null ||
      entry.average !== previousAverage
    ) {
      currentPosition = index + 1;
    }

    positions.set(
      entry.studentId,
      currentPosition
    );

    previousAverage = entry.average;
  });

  return positions;
}

export function formatPosition(
  position: number | null | undefined
): string {
  if (
    position === null ||
    position === undefined
  ) {
    return "Pending";
  }

  const remainder100 = position % 100;

  if (
    remainder100 >= 11 &&
    remainder100 <= 13
  ) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st`;

    case 2:
      return `${position}nd`;

    case 3:
      return `${position}rd`;

    default:
      return `${position}th`;
  }
}