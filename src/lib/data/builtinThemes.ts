import type { ThemeRecord } from '@/types/theme';

/**
 * 初期テーマデータ（プレースホルダ）
 * 将来的には200件程度を想定
 */
export const builtinThemes: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '今日やりたいことは？',
    category: '目標',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今気になっていることは？',
    category: '感情',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '最近うまくいっていることは？',
    category: '振り返り',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '改善したいことは？',
    category: '振り返り',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今週の学びは？',
    category: '学習',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '仕事で大切にしたいことは？',
    category: '仕事',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の気持ちを言葉にすると？',
    category: '感情',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今日の感謝できることは？',
    category: '感謝',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今抱えている悩みは？',
    category: '感情',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今週の目標は？',
    category: '目標',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '最近読んだ本や記事で印象に残ったことは？',
    category: '学習',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の自分に必要なことは？',
    category: '自己理解',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今日の小さな成功は？',
    category: '振り返り',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の自分を励ます言葉は？',
    category: '自己理解',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今週の人間関係で気づいたことは？',
    category: '人間関係',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の自分に足りないものは？',
    category: '自己理解',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今日の小さな発見は？',
    category: '学習',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の自分に必要な休息は？',
    category: '健康',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今週の健康面で気づいたことは？',
    category: '健康',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今の自分を支えているものは？',
    category: '自己理解',
    isActive: true,
    source: 'builtin',
  },
];
