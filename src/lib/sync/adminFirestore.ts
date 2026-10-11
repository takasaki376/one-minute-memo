import "server-only";

import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getFirebaseAdminApp } from "@/lib/firebase/admin";

import { SyncNotConfiguredError } from "./syncErrors";

export function getAdminFirestore(): Firestore {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new SyncNotConfiguredError();
  }
  return getFirestore(app);
}
