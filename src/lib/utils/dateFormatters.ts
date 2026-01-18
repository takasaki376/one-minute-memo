/**
 * セッションの日時をフォーマットする
 * @param date フォーマットする日時（Date または null）
 * @returns フォーマットされた日時文字列（null の場合は "不明"）
 */
export function formatSessionDateTime(date: Date | null): string {
  if (!date) return "不明";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
