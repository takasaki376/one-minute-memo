/**
 * ThemeSeedProvider を「シード完了済み」として扱うテスト用モック。
 *
 * vi.mock は hoisting されるため、各テストファイルで次のように記述する:
 *
 * vi.mock("@/components/providers/ThemeSeedProvider", () => ({
 *   useThemeSeedState: () => themeSeedReadyState,
 * }));
 */
export const themeSeedReadyState = {
  isReady: true,
  isSeeding: false,
  error: undefined,
};
