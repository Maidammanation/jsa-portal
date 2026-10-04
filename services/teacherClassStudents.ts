import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import { getById } from "./database";

type StudentRecord = Record<string, unknown>;

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function getTeacherStudentsByClass(
  classId: string
): Promise<StudentRecord[]> {
  if (!classId) {
    return [];
  }

  const students = new Map<
    string,
    StudentRecord
  >();

  let className = "";

  /*
   * Resolve the actual class name.
   */
  try {
    const classRecord =
      await getById("classes", classId);

    if (classRecord) {
      className = clean(
        (classRecord as StudentRecord).name
      );
    }
  } catch (error) {
    console.warn(
      "Could not resolve class name:",
      error
    );
  }

  /*
   * 1. Normal structure:
   * students.classId === class document ID
   */
  try {
    const q = query(
      collection(db, "students"),
      where("classId", "==", classId)
    );

    const snap = await getDocs(q);

    snap.docs.forEach((studentDoc) => {
      students.set(studentDoc.id, {
        id: studentDoc.id,
        ...studentDoc.data(),
      });
    });
  } catch (error) {
    console.warn(
      "Class ID student lookup failed:",
      error
    );
  }

  /*
   * 2. Legacy structure:
   * students.classId === class name
   */
  if (className) {
    try {
      const q = query(
        collection(db, "students"),
        where("classId", "==", className)
      );

      const snap = await getDocs(q);

      snap.docs.forEach((studentDoc) => {
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
  }

  /*
   * 3. Another legacy structure:
   * students.className === class name
   */
  if (className) {
    try {
      const q = query(
        collection(db, "students"),
        where(
          "className",
          "==",
          className
        )
      );

      const snap = await getDocs(q);

      snap.docs.forEach((studentDoc) => {
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

  /*
   * 4. Last fallback:
   * If the class name itself was supplied as the
   * classId, try resolving the actual class document.
   */
  if (students.size === 0 && !className) {
    try {
      const classQuery = query(
        collection(db, "classes"),
        where("name", "==", classId)
      );

      const classSnap =
        await getDocs(classQuery);

      if (!classSnap.empty) {
        const resolvedClass =
          classSnap.docs[0];

        const resolvedClassId =
          resolvedClass.id;

        const resolvedClassName =
          clean(
            resolvedClass.data().name
          );

        /*
         * Search using resolved class ID.
         */
        try {
          const q = query(
            collection(db, "students"),
            where(
              "classId",
              "==",
              resolvedClassId
            )
          );

          const snap =
            await getDocs(q);

          snap.docs.forEach(
            (studentDoc) => {
              students.set(
                studentDoc.id,
                {
                  id: studentDoc.id,
                  ...studentDoc.data(),
                }
              );
            }
          );
        } catch (error) {
          console.warn(
            "Resolved class ID lookup failed:",
            error
          );
        }

        /*
         * Search using resolved class name.
         */
        if (resolvedClassName) {
          try {
            const q = query(
              collection(db, "students"),
              where(
                "classId",
                "==",
                resolvedClassName
              )
            );

            const snap =
              await getDocs(q);

            snap.docs.forEach(
              (studentDoc) => {
                students.set(
                  studentDoc.id,
                  {
                    id: studentDoc.id,
                    ...studentDoc.data(),
                  }
                );
              }
            );
          } catch (error) {
            console.warn(
              "Resolved class-name lookup failed:",
              error
            );
          }

          try {
            const q = query(
              collection(db, "students"),
              where(
                "className",
                "==",
                resolvedClassName
              )
            );

            const snap =
              await getDocs(q);

            snap.docs.forEach(
              (studentDoc) => {
                students.set(
                  studentDoc.id,
                  {
                    id: studentDoc.id,
                    ...studentDoc.data(),
                  }
                );
              }
            );
          } catch (error) {
            console.warn(
              "Resolved className lookup failed:",
              error
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        "Could not resolve class by name:",
        error
      );
    }
  }

  return Array.from(
    students.values()
  );
}