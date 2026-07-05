export function userCollectionPath(uid: string, name: string): string {
  return `users/${uid}/${name}`;
}

export function userDocPath(
  uid: string,
  collectionName: string,
  docId: string,
): string {
  return `${userCollectionPath(uid, collectionName)}/${docId}`;
}

export const SYNC_COLLECTIONS = {
  memos: "memos",
  sessions: "sessions",
  themes: "themes",
  themeSettings: "themeSettings",
  syncState: "syncState",
} as const;

export const SYNC_STATE_DOC_ID = "main";
