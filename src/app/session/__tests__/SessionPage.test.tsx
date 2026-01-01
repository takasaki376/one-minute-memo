// src/app/session/__tests__/SessionPage.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockThemes = Array.from({ length: 10 }, (_, index) => ({
  id: `theme-${index + 1}`,
  title: `theme ${index + 1}`,
  category: 'general',
  isActive: true,
  source: 'builtin' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}));

vi.mock('@/lib/utils/selectRandomThemes', () => {
  const pickRandomActiveThemes = vi.fn(async (count: number = 10) =>
    mockThemes.slice(0, count),
  );
  return {
    pickRandomActiveThemes,
  };
});

vi.mock('next/navigation', () => {
  const push = vi.fn();
  return {
    useRouter: () => ({ push }),
    __routerPushMock: push,
  };
});

vi.mock('@/lib/timer/useCountdown', () => {
  const startMock = vi.fn();
  const resetMock = vi.fn();

  let lastOnFinish: (() => void) | undefined;

  function useCountdown({
    initialSeconds,
    onFinish,
  }: {
    initialSeconds: number;
    autoStart?: boolean;
    onFinish?: () => void;
  }) {
    lastOnFinish = onFinish;
    return {
      secondsLeft: initialSeconds,
      isRunning: true,
      start: startMock,
      reset: resetMock,
    };
  }

  function __callLastOnFinish() {
    if (lastOnFinish) lastOnFinish();
  }

  return {
    useCountdown,
    __callLastOnFinish,
  };
});

vi.mock('@/lib/db/sessionsRepo', () => {
  const createSession = vi.fn(async (themeIds: string[]) => ({
    id: 'session-1',
    themeIds,
    startedAt: '2025-01-01T00:00:00.000Z',
    endedAt: null,
    memoCount: 0,
  }));

  const completeSession = vi.fn(async () => {});

  return { createSession, completeSession };
});

vi.mock('@/lib/db/memosRepo', () => {
  const saveMemo = vi.fn(async memo => ({
    ...memo,
    id: memo.id ?? 'memo-mocked-id',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }));

  return { saveMemo };
});

import SessionPage from '../page';
import * as sessionsRepo from '@/lib/db/sessionsRepo';
import * as memosRepo from '@/lib/db/memosRepo';
import { __routerPushMock } from 'next/navigation';
import { __callLastOnFinish } from '@/lib/timer/useCountdown';

describe('/session page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a session and saves a memo when moving to the next theme', async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('1 / 10')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
    });

    expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);

    const textarea = screen.getByRole('textbox');
    const nextButton = screen.getByRole('button', { name: /次へ/ });
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'first memo' } });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });
    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];

    expect(savedArg.sessionId).toBe('session-1');
    expect(savedArg.order).toBe(1);
    expect(savedArg.textContent).toBe('first memo');

    await waitFor(() => {
      expect(screen.getByText('2 / 10')).toBeInTheDocument();
    });
  });

  it('completes the session after 10 memos and navigates to complete page', async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('1 / 10')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByRole('textbox');
    const nextButton = screen.getByRole('button', { name: /次へ/ });

    for (let i = 1; i <= 10; i += 1) {
      await act(async () => {
        fireEvent.change(textarea, { target: { value: `memo ${i}` } });
        fireEvent.click(nextButton);
      });

      if (i < 10) {
        await waitFor(() => {
          expect(screen.getByText(`${i + 1} / 10`)).toBeInTheDocument();
        });
      }
    }

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(10);
    });

    await waitFor(() => {
      expect(sessionsRepo.completeSession).toHaveBeenCalledTimes(1);
    });
    const [sessionIdArg, memoCountArg] = (sessionsRepo.completeSession as unknown as Mock).mock.calls[0];
    expect(sessionIdArg).toBe('session-1');
    expect(memoCountArg).toBe(10);

    expect(__routerPushMock).toHaveBeenCalledWith('/session/complete');
  });

  it('saves memo when timer finishes automatically', async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('1 / 10')).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'auto-finished memo' } });
    });

    await act(async () => {
      __callLastOnFinish();
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });

    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];
    expect(savedArg.textContent).toBe('auto-finished memo');

    await waitFor(() => {
      expect(screen.getByText('2 / 10')).toBeInTheDocument();
    });
  });
});

