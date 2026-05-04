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

/**
 * ISO 日時をローカル暦の YYYY-MM-DD に変換（日付フィルタとの突き合わせ用）
 * パース不能な場合は空文字（呼び出し側でフィルタ除外・カレンダー非表示にできる）
 */
export function isoToLocalDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
