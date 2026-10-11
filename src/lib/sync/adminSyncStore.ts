import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";
import type { CloudSyncState, ThemeSettingRecord } from "@/types/sync";

import { stripUndefinedFields } from "./sanitizeForFirestore";
import {
  SYNC_COLLECTIONS,
  SYNC_STATE_DOC_ID,
  userCollectionPath,
  userDocPath,
} from "./paths";
import type { RemoteCollections, UploadPlan } from "./syncPlan";
import type { SyncStore, UploadWriteResult } from "./syncExecute";

const FIRESTORE_BATCH_LIMIT = 450;

async function readCollection<T extends { id: string }>(
  db: Firestore,
  uid: string,
  name: string,
): Promise<Map<string, T>> {
  const snap = await db.collection(userCollectionPath(uid, name)).get();
  const map = new Map<string, T>();
  for (const item of snap.docs) {
    const data = item.data() as T;
    map.set(item.id, { ...data, id: item.id });
  }
  return map;
}

async function writeRecords(
  db: Firestore,
  uid: string,
  collectionName: string,
  records: Array<{ id: string; data: Record<string, unknown> }>,
): Promise<number> {
  let failures = 0;

  for (let i = 0; i < records.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = records.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const record of chunk) {
      batch.set(
        db.doc(userDocPath(uid, collectionName, record.id)),
        stripUndefinedFields(record.data),
      );
    }
    try {
      await batch.commit();
    } catch {
      failures += chunk.length;
    }
  }

  return failures;
}

export function createAdminSyncStore(db: Firestore): SyncStore {
  return {
    async load(uid: string): Promise<RemoteCollections> {
      const [memos, sessions, themes, themeSettings] = await Promise.all([
        readCollection<MemoRecord>(db, uid, SYNC_COLLECTIONS.memos),
        readCollection<SessionRecord>(db, uid, SYNC_COLLECTIONS.sessions),
        readCollection<ThemeRecord>(db, uid, SYNC_COLLECTIONS.themes),
        readCollection<ThemeSettingRecord>(
          db,
          uid,
          SYNC_COLLECTIONS.themeSettings,
        ),
      ]);
      return { memos, sessions, themes, themeSettings };
    },

    async writeUpload(
      uid: string,
      plan: UploadPlan,
    ): Promise<UploadWriteResult> {
      const memoFailures = await writeRecords(
        db,
        uid,
        SYNC_COLLECTIONS.memos,
        plan.memos.map((memo) => ({ id: memo.id, data: { ...memo } })),
      );
      const sessionFailures = await writeRecords(
        db,
        uid,
        SYNC_COLLECTIONS.sessions,
        plan.sessions.map((session) => ({
          id: session.id,
          data: { ...session },
        })),
      );
      const themeFailures = await writeRecords(
        db,
        uid,
        SYNC_COLLECTIONS.themes,
        plan.themes.map((theme) => ({ id: theme.id, data: { ...theme } })),
      );
      const themeSettingFailures = await writeRecords(
        db,
        uid,
        SYNC_COLLECTIONS.themeSettings,
        plan.themeSettings.map((setting) => ({
          id: setting.id,
          data: { ...setting },
        })),
      );

      let deleteFailures = 0;
      for (const id of plan.deletedThemeSettingIds) {
        try {
          await db
            .doc(userDocPath(uid, SYNC_COLLECTIONS.themeSettings, id))
            .delete();
        } catch {
          deleteFailures += 1;
        }
      }

      return {
        memoFailures,
        sessionFailures,
        themeFailures,
        themeSettingFailures,
        deleteFailures,
      };
    },

    async getLastSyncedAt(uid: string): Promise<string | null> {
      const snap = await db
        .doc(userDocPath(uid, SYNC_COLLECTIONS.syncState, SYNC_STATE_DOC_ID))
        .get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data() as Partial<CloudSyncState>;
      return data.lastSyncedAt ?? null;
    },

    async setLastSyncedAt(uid: string, iso: string): Promise<void> {
      const state: CloudSyncState = {
        lastSyncedAt: iso,
        updatedAt: new Date().toISOString(),
      };
      await db
        .doc(userDocPath(uid, SYNC_COLLECTIONS.syncState, SYNC_STATE_DOC_ID))
        .set(state, { merge: true });
    },
  };
}
