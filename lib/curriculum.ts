import type { SchoolLevel } from "@/lib/types";

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[_\s]+/g, "-")
    : "";
}

export function normalizeSchoolLevel(
  value: unknown
): SchoolLevel | "" {
  const normalized = normalizeText(value);

  if (
    normalized === "pre-nursery" ||
    normalized === "prenursery"
  ) {
    return "pre-nursery";
  }

  if (normalized === "nursery") {
    return "nursery";
  }

  if (normalized === "primary") {
    return "primary";
  }

  if (
    normalized === "jss" ||
    normalized === "junior" ||
    normalized === "junior-secondary"
  ) {
    return "jss";
  }

  if (
    normalized === "ss" ||
    normalized === "senior" ||
    normalized === "senior-secondary"
  ) {
    return "ss";
  }

  return "";
}

export function getClassLevel(
  classroom: {
    level?: unknown;
    name?: unknown;
  }
): SchoolLevel | "" {
  const explicitLevel = normalizeSchoolLevel(
    classroom.level
  );

  if (explicitLevel) {
    return explicitLevel;
  }

  const name = normalizeText(classroom.name);

  if (!name) {
    return "";
  }

  if (
    /\b(pre-nursery|prenursery)\b/.test(name)
  ) {
    return "pre-nursery";
  }

  if (/\bnursery\b/.test(name)) {
    return "nursery";
  }

  if (/\bprimary\b/.test(name)) {
    return "primary";
  }

  if (
    /\b(jss|junior|junior-secondary)\b/.test(name)
  ) {
    return "jss";
  }

  if (
    /\b(ss|senior|senior-secondary)\b/.test(name)
  ) {
    return "ss";
  }

  return "";
}

export function subjectAppliesToClass(
  subjectLevels: unknown,
  classLevel: SchoolLevel | ""
): boolean {
  if (
    !classLevel ||
    !Array.isArray(subjectLevels) ||
    subjectLevels.length === 0
  ) {
    return false;
  }

  return subjectLevels.some((level) => {
    return normalizeSchoolLevel(level) === classLevel;
  });
}