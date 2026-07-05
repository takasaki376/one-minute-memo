import {
  collection,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from "firebase/firestore";

import type { CloudSyncState } from "@/types/sync";

import {
  SYNC_COLLECTIONS,
  SYNC_STATE_DOC_ID,
  userCollectionPath,
  userDocPath,
} from "./paths";

export async function getCloudLastSyncedAt(
  db: Firestore,
  uid: string,
): Promise<string | null> {
  const ref = doc(
    db,
    userDocPath(uid, SYNC_COLLECTIONS.syncState, SYNC_STATE_DOC_ID),
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Partial<CloudSyncState>;
  return data.lastSyncedAt ?? null;
}

export async function setCloudLastSyncedAt(
  db: Firestore,
  uid: string,
  iso: string,
): Promise<void> {
  const now = new Date().toISOString();
  const ref = doc(
    db,
    userDocPath(uid, SYNC_COLLECTIONS.syncState, SYNC_STATE_DOC_ID),
  );
  const state: CloudSyncState = {
    lastSyncedAt: iso,
    updatedAt: now,
  };
  await setDoc(ref, state, { merge: true });
}

export function userCollection(db: Firestore, uid: string, name: string) {
  return collection(db, userCollectionPath(uid, name));
}
