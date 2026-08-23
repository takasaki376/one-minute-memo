export type ConflictWinner = "local" | "remote";

/**
 * 両レコードが存在するとき、updatedAt が新しい側を採用する。
 * タイムスタンプ欠落・同値は remote 優先。
 *
 * レコード自体の有無（remote 未作成 / local 未作成）は呼び出し側で先に判定する。
 */
export function winnerByUpdatedAt(
  localUpdatedAt: string | undefined,
  remoteUpdatedAt: string | undefined,
): ConflictWinner {
  if (!localUpdatedAt || !remoteUpdatedAt) {
    return "remote";
  }
  if (localUpdatedAt.localeCompare(remoteUpdatedAt) > 0) {
    return "local";
  }
  return "remote";
}

/**
 * 両 SessionRecord が存在するとき、完了状態（endedAt）で判定する。
 * 完了 vs 未完了は完了側。両方完了または両方未完了は remote 優先。
 *
 * 片方のみ存在する場合は呼び出し側で upload/download を決める。
 */
export function winnerForSession(
  local: { endedAt: string | null },
  remote: { endedAt: string | null },
): ConflictWinner {
  const localDone = local.endedAt !== null;
  const remoteDone = remote.endedAt !== null;
  if (localDone && !remoteDone) {
    return "local";
  }
  return "remote";
}
