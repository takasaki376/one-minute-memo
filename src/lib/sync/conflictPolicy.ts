export type ConflictWinner = "local" | "remote";

/**
 * updatedAt が新しい側を採用する。
 * 欠落・同値など未確定のときはサーバー（remote）優先。
 */
export function winnerByUpdatedAt(
  localUpdatedAt: string | undefined,
  remoteUpdatedAt: string | undefined,
): ConflictWinner {
  if (!localUpdatedAt) {
    return "remote";
  }
  if (!remoteUpdatedAt) {
    return "local";
  }
  if (localUpdatedAt.localeCompare(remoteUpdatedAt) > 0) {
    return "local";
  }
  return "remote";
}

/**
 * SessionRecord に updatedAt が無いため、完了状態（endedAt）で判定する。
 * 完了 vs 未完了は完了側。両方完了または両方未完了はサーバー優先。
 */
export function winnerForSession(
  local: { endedAt: string | null } | undefined,
  remote: { endedAt: string | null } | undefined,
): ConflictWinner {
  if (!remote && local) {
    return "local";
  }
  if (!local || !remote) {
    return "remote";
  }

  const localDone = local.endedAt !== null;
  const remoteDone = remote.endedAt !== null;
  if (localDone && !remoteDone) {
    return "local";
  }
  return "remote";
}
