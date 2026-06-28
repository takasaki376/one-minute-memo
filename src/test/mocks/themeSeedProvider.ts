/**
 * ThemeSeedProvider を「シード完了済み」として扱うテスト用モック。
 *
 * vi.mock は hoist されるため、factory 内で dynamic import する:
 *
 * vi.mock("@/components/providers/ThemeSeedProvider", async () => {
 *   const { themeSeedReadyState } = await import("@/test/mocks/themeSeedProvider");
 *   return {
 *     useThemeSeedState: () => themeSeedReadyState,
 *   };
 * });
 */
export const themeSeedReadyState = {
  isReady: true,
  isSeeding: false,
  error: undefined,
};
