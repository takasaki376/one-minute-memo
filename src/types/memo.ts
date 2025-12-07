export type HandwritingType = 'none' | 'dataUrl'; // MVPは dataUrl のみでもOK

export interface MemoRecord {
  id: string; // 'memo-xxxxx'
  sessionId: string;
  themeId: string;
  order: number; // セッション内の順番 (1〜10)

  textContent: string;
  handwritingType: HandwritingType;
  handwritingDataUrl?: string; // Canvas → dataURL を保存

  createdAt: string;
  updatedAt: string;
}
