"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSession, completeSession } from "@/lib/db/sessionsRepo";
import { getMemosBySession, saveMemo } from "@/lib/db/memosRepo";

export interface SessionTheme {
  id: string;
  title: string;
  category?: string;
}

export interface UseSessionFlowOptions {
  themes: SessionTheme[];
  currentIndex: number;
  currentTheme: SessionTheme | null;
  text: string;
  handwritingDataUrl: string | null;
  secondsPerTheme: number;
  resetTimer: (seconds: number) => void;
  startTimer: () => void;
  onAdvanceToNextTheme: (nextIndex: number) => void;
  onSessionCompleted: (sessionId: string) => void;
}

export interface UseSessionFlowResult {
  sessionId: string | null;
  memoCount: number;
  handleThemeFinished: (options?: { triggeredByUser?: boolean }) => Promise<void>;
  handleThemeFinishedAuto: () => Promise<void>;
}

/**
 * セッション中のメモ保存・テーマ進行・完了処理を担うフック
 */
export function useSessionFlow(
  options: UseSessionFlowOptions,
): UseSessionFlowResult {
  const {
    themes,
    currentIndex,
    currentTheme,
    text,
    handwritingDataUrl,
    secondsPerTheme,
    resetTimer,
    startTimer,
    onAdvanceToNextTheme,
    onSessionCompleted,
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);
  const savingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const saveCurrentMemo = useCallback(
    async (index: number, themeId: string): Promise<string | null> => {
      let currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        if (themes.length === 0) {
          console.error(
            "テーマが設定されていないためセッションを作成できません",
          );
          return null;
        }
        try {
          const session = await createSession(themes.map((t) => t.id));
          currentSessionId = session.id;
          sessionIdRef.current = session.id;
          setSessionId(session.id);
          if (process.env.NODE_ENV === "development") {
            console.log("最初のメモ保存時にセッションを作成しました:", {
              id: session.id,
              themeIds: session.themeIds,
              startedAt: session.startedAt,
              memoCount: session.memoCount,
            });
          }
        } catch (e) {
          console.error("Failed to create session", e);
          return null;
        }
      }

      try {
        const savedMemo = await saveMemo({
          sessionId: currentSessionId,
          themeId,
          order: index + 1,
          textContent: text,
          handwritingType: handwritingDataUrl ? "dataUrl" : "none",
          handwritingDataUrl: handwritingDataUrl ?? undefined,
        });

        if (process.env.NODE_ENV === "development") {
          console.log("メモを保存しました:", {
            id: savedMemo.id,
            sessionId: savedMemo.sessionId,
            themeId: savedMemo.themeId,
            order: savedMemo.order,
            textLength: savedMemo.textContent.length,
            hasHandwriting: savedMemo.handwritingType !== "none",
            currentIndex: index,
            createdAt: savedMemo.createdAt,
            updatedAt: savedMemo.updatedAt,
            totalThemes: themes.length,
            isLastTheme: index === themes.length - 1,
          });
        }

        setMemoCount((prev) => prev + 1);
        return currentSessionId;
      } catch (e) {
        console.error("Failed to save memo", e);
        return currentSessionId;
      }
    },
    [themes, text, handwritingDataUrl],
  );

  const completeSessionFlow = useCallback(
    async (completedSessionId: string) => {
      try {
        const actualMemos = await getMemosBySession(completedSessionId);
        const actualMemoCount = actualMemos.length;
        await completeSession(completedSessionId, actualMemoCount);
        if (process.env.NODE_ENV === "development") {
          console.log("セッションを完了しました:", {
            sessionId: completedSessionId,
            actualMemoCount,
          });
        }
      } catch (e) {
        console.error("Failed to complete session", e);
      }

      onSessionCompleted(completedSessionId);
    },
    [onSessionCompleted],
  );

  const handleThemeFinished = useCallback(
    async (finishOptions?: { triggeredByUser?: boolean }) => {
      if (savingRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("handleThemeFinished をスキップ（既に保存中）:", {
            currentIndex,
            sessionId: sessionIdRef.current,
          });
        }
        return;
      }

      if (!currentTheme) {
        if (process.env.NODE_ENV === "development") {
          console.log("handleThemeFinished をスキップ（テーマなし）:", {
            currentIndex,
            sessionId: sessionIdRef.current,
          });
        }
        return;
      }

      savingRef.current = true;

      try {
        const currentIndexToSave = currentIndex;
        const themeIdToSave = currentTheme.id;
        const isLastThemeToSave =
          themes.length > 0 && currentIndexToSave === themes.length - 1;

        if (process.env.NODE_ENV === "development") {
          console.log("handleThemeFinished 開始:", {
            currentIndex: currentIndexToSave,
            themeId: themeIdToSave,
            sessionId: sessionIdRef.current,
            isLastTheme: isLastThemeToSave,
            totalThemes: themes.length,
            triggeredByUser: finishOptions?.triggeredByUser,
          });
        }

        const activeSessionId = await saveCurrentMemo(
          currentIndexToSave,
          themeIdToSave,
        );

        if (!activeSessionId) {
          return;
        }

        if (isLastThemeToSave) {
          await completeSessionFlow(activeSessionId);
          return;
        }

        onAdvanceToNextTheme(currentIndexToSave + 1);
        resetTimer(secondsPerTheme);
        startTimer();
      } finally {
        savingRef.current = false;
      }
    },
    [
      completeSessionFlow,
      currentIndex,
      currentTheme,
      onAdvanceToNextTheme,
      resetTimer,
      saveCurrentMemo,
      secondsPerTheme,
      startTimer,
      themes.length,
    ],
  );

  const handleThemeFinishedAuto = useCallback(async () => {
    await handleThemeFinished({ triggeredByUser: false });
  }, [handleThemeFinished]);

  return {
    sessionId,
    memoCount,
    handleThemeFinished,
    handleThemeFinishedAuto,
  };
}
