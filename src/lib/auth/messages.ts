import { FirebaseError } from "firebase/app";

/** Firebase Auth エラーをユーザー向け日本語メッセージに変換する */
export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "メールアドレスの形式が正しくありません";
      case "auth/user-disabled":
        return "このアカウントは無効化されています";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "メールアドレスまたはパスワードが正しくありません";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に登録されています";
      case "auth/weak-password":
        return "パスワードは6文字以上で入力してください";
      case "auth/too-many-requests":
        return "試行回数が多すぎます。しばらく待ってから再度お試しください";
      case "auth/network-request-failed":
        return "ネットワークエラーが発生しました";
      default:
        return error.message || "認証処理に失敗しました";
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Firebase is not configured")) {
      return "認証機能は現在利用できません（Firebase 未設定）";
    }
    return error.message;
  }

  return "認証処理に失敗しました";
}

export const AUTH_SIGNUP_SUCCESS_MESSAGE =
  "アカウントを作成しました。確認メールを送信しました。メール内のリンクから認証を完了してください。";
