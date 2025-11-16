import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { useNipsByKind } from './useNipsByKind';

// Mock the nostr query
const mockQuery = vi.fn();
vi.mock('@nostrify/react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNostr: () => ({
      nostr: {
        query: mockQuery,
      },
    }),
  };
});

describe('useNipsByKind', () => {
  it('should query for NIPs with the specified kind', async () => {
    const mockEvents = [
      {
        id: 'event1',
        pubkey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        created_at: 1000,
        kind: 30817,
        tags: [['k', '1'], ['d', 'test-nip']],
        content: 'Test NIP content',
        sig: 'sig1',
      },
      {
        id: 'event2',
        pubkey: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        created_at: 2000,
        kind: 30817,
        tags: [['k', '1'], ['d', 'another-nip']],
        content: 'Another NIP content',
        sig: 'sig2',
      },
    ];

    mockQuery.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useNipsByKind('1'), {
      wrapper: TestApp,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery).toHaveBeenCalledWith(
      [{
        kinds: [30817],
        '#k': ['1'],
        limit: 200,
      }],
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );

    // The hook sorts by created_at descending, so event2 (2000) comes before event1 (1000)
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.id).toBe('event2'); // event2 with created_at: 2000
    expect(result.current.data?.[1]?.id).toBe('event1'); // event1 with created_at: 1000
  });

  it('should not query when kind is empty', () => {
    mockQuery.mockClear();

    const { result } = renderHook(() => useNipsByKind(''), {
      wrapper: TestApp,
    });

    // When kind is empty, the query should be disabled and not execute
    expect(result.current.data).toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should handle query errors', async () => {
    const error = new Error('Query failed');
    mockQuery.mockRejectedValue(error);

    const { result } = renderHook(() => useNipsByKind('1'), {
      wrapper: TestApp,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});