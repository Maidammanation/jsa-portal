// services/storage.ts
// Firebase Storage helpers for branding assets (logo, stamp, signatures) and
// any other file uploads (e.g. student photos, result PDFs).

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

/** Uploads a file to the given path and returns its public download URL. */
export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

// Convenience wrappers for the specific branding assets mentioned in the spec.
export const uploadSchoolLogo = (file: File) => uploadFile("branding/school-logo.png", file);
export const uploadSchoolStamp = (file: File) => uploadFile("branding/school-stamp.png", file);
export const uploadPrincipalSignature = (file: File) =>
  uploadFile("branding/principal-signature.png", file);
export const uploadClassTeacherSignature = (teacherUid: string, file: File) =>
  uploadFile(`branding/teacher-signatures/${teacherUid}.png`, file);
