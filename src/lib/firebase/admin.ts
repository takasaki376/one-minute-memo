import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

import {
  getFirebaseAdminConfig,
  isFirebaseAdminConfigured,
} from "./adminEnv";

export { isFirebaseAdminConfigured };

export function getFirebaseAdminApp(): App | null {
  const config = getFirebaseAdminConfig();
  if (!config) {
    return null;
  }

  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  });
}

export function getFirebaseAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }
  return getAuth(app);
}
