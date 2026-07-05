"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { getFirebaseConfig } from "./env";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const config = getFirebaseConfig();
  if (!config) {
    return null;
  }

  if (!firebaseAuth) {
    firebaseApp =
      getApps().length === 0 ? initializeApp(config) : getApps()[0] ?? null;
    if (!firebaseApp) {
      firebaseApp = initializeApp(config);
    }
    firebaseAuth = getAuth(firebaseApp);
  }

  return firebaseAuth;
}
