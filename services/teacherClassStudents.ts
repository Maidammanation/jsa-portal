import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import { getById } from "./database";

export async function getTeacherStudentsByClass(
  classId: string
) {
  if (!classId) {
    return [];
  }

  const students = new Map<
    string,
    Record<string, unknown>
  >();

  /*
   * 1. Normal format:
   * students.classId === classes.id
   */
  try {
    const normalQuery = query(
      collection(db, "students"),
      where("classId", "==", classId)
    );

    const normalSnap =
      await getDocs(normalQuery);

    normalSnap.docs.forEach((studentDoc) => {
      students.set(studentDoc.id, {
        id: studentDoc.id,
        ...studentDoc.data(),
      });
    });
  } catch (error) {
    console.warn(
      "Normal student class lookup failed:",
      error
    );
  }

  /*
   * 2. Resolve the actual class name.
   */
  let className = "";

  try {
    const classRecord =
      await getById("classes", classId);

    if (classRecord) {
      className = String(
        (classRecord as Record<string, unknown>)
          .name || ""
      ).trim();
    }
  } catch (error) {
    console.warn(
      "Could not resolve class name:",
      error
    );
  }

  /*
   * If we already found students, return them.
   */
  if (students.size > 0) {
    return Array.from(students.values());
  }

  /*
   * 3. Legacy format:
   * students.classId === class name
   */
  if (className) {
    try {
      const legacyIdQuery = query(
        collection(db, "students"),
        where("classId", "==", className)
      );

      const legacyIdSnap =
        await getDocs(legacyIdQuery);

      legacyIdSnap.docs.forEach((studentDoc) => {
        students.set(studentDoc.id, {
          id: studentDoc.id,
          ...studentDoc.data(),
        });
      });
    } catch (error) {
      console.warn(
        "Legacy classId lookup failed:",
        error
      );
    }

    /*
     * 4. Another legacy format:
     * students.className === class name
     */
    try {
      const legacyNameQuery = query(
        collection(db, "students"),
        where(
          "className",
          "==",
          className
        )
      );

      const legacyNameSnap =
        await getDocs(legacyNameQuery);

      legacyNameSnap.docs.forEach((studentDoc) => {
        students.set(studentDoc.id, {
          id: studentDoc.id,
          ...studentDoc.data(),
        });
      });
    } catch (error) {
      console.warn(
        "Legacy className lookup failed:",
        error
      );
    }
  }

  return Array.from(
    students.values()
  );
}