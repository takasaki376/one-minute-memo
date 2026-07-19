"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { formatSyncDateTime } from "@/lib/sync/formatSyncDateTime";
import {
  SYNC_LOGIN_REQUIRED_MESSAGE,
  SYNC_OTHER_DEVICE_HINT,
} from "@/lib/sync/messages";
import { hasRemoteSyncDifference } from "@/lib/sync/syncDiff";
import {
  fetchCloudLastSyncedAt,
  fetchLocalLastSyncedAt,
  syncUserData,
} from "@/lib/sync/syncService";
import type { SyncResult, SyncStatus } from "@/types/sync";

function buildResultMessage(result: SyncResult): string {
  if (!result.success) {
    return result.error ?? "同期に失敗しました";
  }

  const parts = [
    `アップロード: メモ ${result.uploadedMemos} 件`,
    `ダウンロード: メモ ${result.downloadedMemos} 件`,
    `アップロード: テーマ ${result.uploadedThemes} 件`,
    `ダウンロード: テーマ ${result.downloadedThemes} 件`,
    `テーマ設定 更新 ${result.updatedThemeSettings} 件`,
  ];

  if (result.uploadFailures > 0 || result.downloadFailures > 0) {
    parts.push(
      `一部失敗: アップロード ${result.uploadFailures} 件 / ダウンロード ${result.downloadFailures} 件`,
    );
  }

  return parts.join(" / ");
}

export function SyncSection() {
  const { user, isLoading, isConfigured } = useAuth();
  const [localLastSyncedAt, setLocalLastSyncedAt] = useState<string | null>(
    null,
  );
  const [cloudLastSyncedAt, setCloudLastSyncedAt] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isConfigured || isLoading) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsRefreshing(true);
      try {
        const [local, cloud] = await Promise.all([
          fetchLocalLastSyncedAt(),
          user ? fetchCloudLastSyncedAt(user.uid) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setLocalLastSyncedAt(local);
          setCloudLastSyncedAt(cloud);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isConfigured, isLoading, user]);

  const showOtherDeviceHint = hasRemoteSyncDifference(
    localLastSyncedAt,
    cloudLastSyncedAt,
  );

  const handleSync = async () => {
    if (!user) {
      setStatus("error");
      setResultMessage(SYNC_LOGIN_REQUIRED_MESSAGE);
      return;
    }

    setStatus("syncing");
    setResultMessage(null);

    const result = await syncUserData(user.uid);
    if (result.success) {
      setStatus("success");
      setResultMessage(buildResultMessage(result));
      setLocalLastSyncedAt(result.syncedAt);
      setCloudLastSyncedAt(result.syncedAt);
    } else {
      setStatus("error");
      setResultMessage(result.error ?? "同期に失敗しました");
    }
  };

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-label="データ同期"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        データ同期
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        メモとテーマ設定を Firestore と手動で同期します。
      </p>

      {!isConfigured && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Firebase が未設定のため同期できません。
        </p>
      )}

      {isConfigured && isLoading && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          認証状態を確認しています...
        </p>
      )}

      {isConfigured && !isLoading && !user && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          {SYNC_LOGIN_REQUIRED_MESSAGE}
        </p>
      )}

      {isConfigured && !isLoading && user && (
        <div className="mt-4 space-y-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">前回同期</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {isRefreshing ? "読み込み中..." : formatSyncDateTime(localLastSyncedAt)}
              </dd>
            </div>
          </dl>

          {showOtherDeviceHint && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {SYNC_OTHER_DEVICE_HINT}
            </div>
          )}

          {status === "success" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              同期が完了しました
            </div>
          )}

          {status === "error" && resultMessage && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {resultMessage}
            </div>
          )}

          {status === "success" && resultMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {resultMessage}
            </p>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={status === "syncing"}
            disabled={status === "syncing"}
            onClick={() => void handleSync()}
            data-testid="sync-data-button"
          >
            データを同期
          </Button>
        </div>
      )}
    </section>
  );
}
