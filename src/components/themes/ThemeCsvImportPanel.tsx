"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { importUserThemesFromCsvRows } from "@/lib/db/themesRepo";
import {
  downloadThemeCsvSample,
  parseThemeCsv,
  type ThemeCsvRowError,
} from "@/lib/themes/themeCsv";
import type { ThemeRecord } from "@/types/theme";

export interface ThemeCsvImportPanelProps {
  onImported: (themes: ThemeRecord[]) => void;
}

type ImportSummary = {
  successCount: number;
  failureCount: number;
  parseErrors: ThemeCsvRowError[];
  rowErrors: Array<{ lineNumber: number; message: string }>;
};

export function ThemeCsvImportPanel({ onImported }: ThemeCsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleSelectFile = async (file: File | null) => {
    setFileError(null);
    setSummary(null);
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseThemeCsv(text);
      if (!parsed.ok) {
        setFileError(parsed.fileError);
        return;
      }

      const importResult = await importUserThemesFromCsvRows(
        parsed.rows.map((row) => ({
          lineNumber: row.lineNumber,
          title: row.title,
          category: row.category,
        })),
      );

      const importedThemes = importResult.results
        .filter(
          (
            result,
          ): result is { lineNumber: number; ok: true; theme: ThemeRecord } =>
            result.ok,
        )
        .map((result) => result.theme);

      if (importedThemes.length > 0) {
        onImported(importedThemes);
      }

      setSummary({
        successCount: importResult.successCount,
        failureCount:
          importResult.failureCount + parsed.rowErrors.length,
        parseErrors: parsed.rowErrors,
        rowErrors: importResult.results
          .filter(
            (
              result,
            ): result is { lineNumber: number; ok: false; error: string } =>
              !result.ok,
          )
          .map((result) => ({
            lineNumber: result.lineNumber,
            message: result.error,
          })),
      });
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "CSVの読み込みに失敗しました",
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4"
      aria-label="CSV一括登録"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">CSV一括登録</h2>
          <p className="mt-1 text-xs text-slate-600">
            テーマ名・カテゴリ名の CSV から user テーマを一括追加します（メモ列は任意ですが、現時点ではテーマに保存されません）。
            カテゴリ名は既存と一致すればそのカテゴリに、未登録なら新規カテゴリとして保存されます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => downloadThemeCsvSample()}
            data-testid="themes-csv-sample-download"
          >
            サンプルCSVダウンロード
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={importing}
            onClick={() => fileInputRef.current?.click()}
            data-testid="themes-csv-import-open"
          >
            CSVを選択して登録
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSVファイルを選択"
            onChange={(e) => {
              void handleSelectFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>
      </div>

      {fileError && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {fileError}
        </div>
      )}

      {summary && (
        <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          <p>
            登録成功: {summary.successCount} 件 / 失敗: {summary.failureCount} 件
          </p>
          {[...summary.parseErrors, ...summary.rowErrors].length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-rose-800">
              {[...summary.parseErrors, ...summary.rowErrors].map((error) => (
                <li key={`${error.lineNumber}-${error.message}`}>
                  {`${error.lineNumber}行目: ${error.message}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
