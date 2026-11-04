import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!cookie) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const db = adminDb();
    const userDoc = await db.doc(`users/${decoded.uid}`).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 404 }
      );
    }

    const user = userDoc.data() || {};

    if (user.role !== "teacher" || user.status !== "active") {
      return NextResponse.json(
        { error: "Only active teacher accounts can use this feature." },
        { status: 403 }
      );
    }

    const teachers = await db
      .collection("teachers")
      .where("authUid", "==", decoded.uid)
      .limit(1)
      .get();

    if (teachers.empty) {
      return NextResponse.json(
        { error: "Your account is not linked to a teacher record." },
        { status: 403 }
      );
    }

    const teacher = teachers.docs[0].data();
    const assignment = clean(
      teacher.formClassId ||
      teacher.formMasterClassId ||
      teacher.formMasterClassName
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned as a Form Master." },
        { status: 403 }
      );
    }

    const classesSnapshot = await db.collection("classes").get();

    const classList: { id: string; name: string }[] =
      classesSnapshot.docs.map((classDoc) => {
        const data = classDoc.data() as Record<string, unknown>;
        return {
          id: classDoc.id,
          name: clean(data.name),
        };
      });

    const classroom = classList.find(
      (item) =>
        normalize(item.id) === normalize(assignment) ||
        normalize(item.name) === normalize(assignment)
    );

    if (!classroom) {
      return NextResponse.json(
        { error: "Your assigned class could not be found." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const gender = clean(body.gender);
    const dateOfBirth = clean(body.dateOfBirth);

    // Arabic is ON unless the request explicitly sets it to false.
    const attendsArabic = body.attendsArabic !== false;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 }
      );
    }

    if (gender !== "male" && gender !== "female") {
      return NextResponse.json(
        { error: "Please select a valid gender." },
        { status: 400 }
      );
    }

    const className = classroom.name;
    const normalizedName = normalize(className);
    const match = normalizedName.match(
      /^(pre nursery|nursery|primary|jss|ss)\s*(\d+)?/
    );

    let code = "GEN";

    if (match) {
      if (match[1] === "pre nursery") {
        code = "PN";
      } else if (match[1] === "nursery") {
        code = `N${match[2] || ""}`;
      } else if (match[1] === "primary") {
        code = `P${match[2] || ""}`;
      } else {
        code = `${match[1].toUpperCase()}${match[2] || ""}`;
      }
    }

    const actor =
      clean(user.name) || clean(user.email) || "Form Master";

    const student: Record<string, unknown> = {
      firstName,
      lastName,
      classId: classroom.id,
      className,
      gender,
      status: "active",
      attendsArabic,
      createdBy: actor,
      createdAt: new Date(),
    };

    if (dateOfBirth) {
      student.dateOfBirth = dateOfBirth;
    }

    // Allocate the admission number and create the student atomically.
    // The per-class counter serializes requests for the same class.
    // The global registry also prevents collisions across different classes
    // that may happen to use the same class code.
    const counterRef = db
      .collection("studentAdmissionCounters")
      .doc(encodeURIComponent(classroom.id));

    const studentRef = db.collection("students").doc();

    const admissionNo = await db.runTransaction(async (transaction) => {
      const [counterSnapshot, classStudents] = await Promise.all([
        transaction.get(counterRef),
        transaction.get(
          db.collection("students").where("classId", "==", classroom.id)
        ),
      ]);

      let highestExistingNumber = 0;

      classStudents.docs.forEach((studentDoc) => {
        const existingAdmissionNo = clean(studentDoc.data().admissionNo);
        const number = existingAdmissionNo.match(/\/(\d+)$/);

        if (number) {
          highestExistingNumber = Math.max(
            highestExistingNumber,
            Number(number[1])
          );
        }
      });

      const storedNextNumber = Number(
        counterSnapshot.data()?.nextNumber || 1
      );

      let candidateNumber = Math.max(
        highestExistingNumber + 1,
        Number.isFinite(storedNextNumber) && storedNextNumber > 0
          ? storedNextNumber
          : 1
      );

      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate =
          `JSA/${code}/${String(candidateNumber).padStart(4, "0")}`;

        const registryRef = db
          .collection("studentAdmissionNumbers")
          .doc(encodeURIComponent(candidate));

        const [registrySnapshot, legacyDuplicate] = await Promise.all([
          transaction.get(registryRef),
          transaction.get(
            db.collection("students")
              .where("admissionNo", "==", candidate)
              .limit(1)
          ),
        ]);

        if (!registrySnapshot.exists && legacyDuplicate.empty) {
          transaction.create(registryRef, {
            admissionNo: candidate,
            studentId: studentRef.id,
            classId: classroom.id,
            createdAt: new Date(),
          });

          transaction.create(studentRef, {
            ...student,
            admissionNo: candidate,
          });

          transaction.set(
            counterRef,
            {
              nextNumber: candidateNumber + 1,
              classId: classroom.id,
              updatedAt: new Date(),
            },
            { merge: true }
          );

          return candidate;
        }

        candidateNumber += 1;
      }

      throw new Error(
        "Could not generate a unique admission number. Contact the administrator."
      );
    });

    await db.collection("activityLog").add({
      action: "Student added by Form Master",
      actor,
      details: `${firstName} ${lastName} — ${className} — ${admissionNo}`,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Student added successfully.",
        student: {
          id: studentRef.id,
          admissionNo,
          firstName,
          lastName,
          classId: classroom.id,
          className,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Form Master student creation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not add student.",
      },
      { status: 500 }
    );
  }
}
