// このファイルはテスト用のモックのために作成されています
// 実際の実装は後で追加されます

export async function saveMemo(memo: {
  id?: string;
  sessionId: string;
  themeId: string;
  order: number;
  textContent: string;
  handwritingType?: 'none' | 'blob' | 'dataUrl';
  handwritingBlob?: Blob;
  handwritingDataUrl?: string;
}) {
  throw new Error('Not implemented');
}
