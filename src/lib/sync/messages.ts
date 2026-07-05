import { FirebaseError } from "firebase/app";

export const SYNC_LOGIN_REQUIRED_MESSAGE =
  "データ同期を利用するにはログインしてください";

export const SYNC_NOT_CONFIGURED_MESSAGE =
  "Firebase が未設定のため同期できません";

export const SYNC_GENERIC_ERROR_MESSAGE =
  "同期に失敗しました。しばらくしてから再度お試しください";

export const SYNC_PERMISSION_ERROR_MESSAGE =
  "同期の権限がありません。再ログインするか、Firebase の設定を確認してください";

export const SYNC_OTHER_DEVICE_HINT =
  "他の端末で同期された可能性があります。最新データを取り込むには同期してください。";

export function toSyncErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (
      error.code === "permission-denied" ||
      error.code === "unauthenticated"
    ) {
      return SYNC_PERMISSION_ERROR_MESSAGE;
    }
    if (error.code === "unavailable" || error.code === "deadline-exceeded") {
      return "Firestore に接続できませんでした。ネットワークを確認してください";
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return SYNC_GENERIC_ERROR_MESSAGE;
}
