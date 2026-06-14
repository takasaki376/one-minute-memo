export const THEME_CSV_TITLE_HEADER = "テーマ名";
export const THEME_CSV_CATEGORY_HEADER = "カテゴリ名";
export const THEME_CSV_MEMO_HEADER = "メモ";

export const THEME_CSV_SAMPLE_FILENAME = "theme-import-sample.csv";

export const THEME_CSV_SAMPLE_CONTENT = `${THEME_CSV_TITLE_HEADER},${THEME_CSV_CATEGORY_HEADER},${THEME_CSV_MEMO_HEADER}
朝会用トーク,仕事,チーム共有ネタ
旅行したい場所,プライベート,北海道
`;

export const THEME_CSV_TITLE_MAX = 200;
export const THEME_CSV_CATEGORY_MAX = 100;

export type ThemeCsvParsedRow = {
  lineNumber: number;
  title: string;
  category: string;
  memo: string;
};

export type ThemeCsvRowError = {
  lineNumber: number;
  message: string;
};

export type ParseThemeCsvResult =
  | { ok: false; fileError: string }
  | {
      ok: true;
      rows: ThemeCsvParsedRow[];
      rowErrors: ThemeCsvRowError[];
    };

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 改行を含む quoted フィールドに対応した CSV レコード分解 */
export function splitCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let inQuotes = false;

  let rowFields: string[] = [];
  let field = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      rowFields.push(field);
      field = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      rowFields.push(field);
      if (rowFields.some((cell) => cell.trim().length > 0)) {
        records.push(rowFields);
      }
      rowFields = [];
      field = "";
      continue;
    }
    field += ch;
  }

  rowFields.push(field);
  if (rowFields.some((cell) => cell.trim().length > 0)) {
    records.push(rowFields);
  }

  return records;
}

function normalizeHeader(value: string): string {
  return value.trim();
}

export function parseThemeCsv(rawText: string): ParseThemeCsvResult {
  const text = stripUtf8Bom(rawText.trim());
  if (text.length === 0) {
    return { ok: false, fileError: "CSVファイルが空です" };
  }

  let records: string[][];
  try {
    records = splitCsvRecords(text);
  } catch (err) {
    return {
      ok: false,
      fileError: err instanceof Error ? err.message : "CSVの解析に失敗しました",
    };
  }
  if (records.length === 0) {
    return { ok: false, fileError: "CSVにデータがありません" };
  }

  const headerRow = records[0].map(normalizeHeader);
  const titleIndex = headerRow.indexOf(THEME_CSV_TITLE_HEADER);
  const categoryIndex = headerRow.indexOf(THEME_CSV_CATEGORY_HEADER);
  const memoIndex = headerRow.indexOf(THEME_CSV_MEMO_HEADER);

  if (titleIndex === -1 || categoryIndex === -1) {
    return {
      ok: false,
      fileError: `ヘッダー行に「${THEME_CSV_TITLE_HEADER}」「${THEME_CSV_CATEGORY_HEADER}」が必要です`,
    };
  }

  const rows: ThemeCsvParsedRow[] = [];
  const rowErrors: ThemeCsvRowError[] = [];
  const seenTitles = new Set<string>();

  for (let i = 1; i < records.length; i++) {
    const lineNumber = i + 1;
    const record = records[i];
    const title = (record[titleIndex] ?? "").trim();
    const category = (record[categoryIndex] ?? "").trim();
    const memo =
      memoIndex >= 0 ? (record[memoIndex] ?? "").trim() : "";

    if (title.length === 0) {
      rowErrors.push({ lineNumber, message: "テーマ名が空です" });
      continue;
    }
    if (title.length > THEME_CSV_TITLE_MAX) {
      rowErrors.push({
        lineNumber,
        message: `テーマ名は${String(THEME_CSV_TITLE_MAX)}文字以内にしてください`,
      });
      continue;
    }
    if (category.length > THEME_CSV_CATEGORY_MAX) {
      rowErrors.push({
        lineNumber,
        message: `カテゴリ名は${String(THEME_CSV_CATEGORY_MAX)}文字以内にしてください`,
      });
      continue;
    }

    const normalizedTitle = title.toLowerCase();
    if (seenTitles.has(normalizedTitle)) {
      rowErrors.push({
        lineNumber,
        message: "CSV内に同じテーマ名が重複しています",
      });
      continue;
    }
    seenTitles.add(normalizedTitle);

    rows.push({ lineNumber, title, category, memo });
  }

  return { ok: true, rows, rowErrors };
}

export function downloadThemeCsvSample(): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([`\uFEFF${THEME_CSV_SAMPLE_CONTENT}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = THEME_CSV_SAMPLE_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
