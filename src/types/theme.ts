export type ThemeSource = 'builtin' | 'user';

export interface ThemeRecord {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  source: ThemeSource;
  createdAt: string;
  updatedAt: string;
}
