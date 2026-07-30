"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { getFirebaseConfig } from "./env";

let firebaseAuth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const config = getFirebaseConfig();
  if (!config) {
    return null;
  }

  if (!firebaseAuth) {
    const app = getApps()[0] ?? initializeApp(config);
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth;
}
