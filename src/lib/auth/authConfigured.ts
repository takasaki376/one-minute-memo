import "server-only";

import { isFirebaseAdminConfigured } from "@/lib/firebase/adminEnv";
import { isFirebaseWebApiKeyConfigured } from "@/lib/firebase/webApiKey";

/** サインイン／サインアップに必要なサーバー設定が揃っているか */
export function isAuthConfigured(): boolean {
  return isFirebaseAdminConfigured() && isFirebaseWebApiKeyConfigured();
}
