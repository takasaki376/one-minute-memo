"use client";

import { getFirestore, type Firestore } from "firebase/firestore";

import { getFirebaseAuth } from "./client";

let firestoreDb: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  if (!firestoreDb) {
    firestoreDb = getFirestore(auth.app);
  }

  return firestoreDb;
}
