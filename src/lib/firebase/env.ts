export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

/** Identity Toolkit REST に使う Web API キー。ログイン UI の有効判定はこれだけを見る。 */
export function getFirebaseWebApiKey(): string | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "";
  return apiKey.length > 0 ? apiKey : null;
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const config: FirebaseConfig = {
    apiKey: getFirebaseWebApiKey() ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  ) {
    return null;
  }

  return config;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseWebApiKey() !== null;
}
