import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../services/media', () => ({
  deleteMediaFile: jest.fn(() => Promise.resolve()),
}));

import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  toggleBookmark,
  mergeEntries,
  formatDate,
  CorruptStorageError,
} from '../services/storage';
import { deleteMediaFile } from '../services/media';

const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getEntries', () => {
  it('returns empty array when storage is empty', async () => {
    mockedStorage.getItem.mockResolvedValue(null);
    const entries = await getEntries();
    expect(entries).toEqual([]);
  });

  it('returns entries sorted newest first', async () => {
    const data = [
      { id: '1', createdAt: '2024-01-01T00:00:00Z', content: [] },
      { id: '2', createdAt: '2024-06-01T00:00:00Z', content: [] },
    ];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(data));
    const entries = await getEntries();
    expect(entries[0].id).toBe('2');
    expect(entries[1].id).toBe('1');
  });

  it('throws CorruptStorageError on invalid JSON (refuses to silently return [] which would risk overwrite)', async () => {
    mockedStorage.getItem.mockResolvedValue('not-json');
    await expect(getEntries()).rejects.toBeInstanceOf(CorruptStorageError);
  });

  it('throws CorruptStorageError when stored data is not an array', async () => {
    mockedStorage.getItem.mockResolvedValue('{"oops": true}');
    await expect(getEntries()).rejects.toBeInstanceOf(CorruptStorageError);
  });
});

describe('createEntry', () => {
  it('refuses to write when existing storage is corrupt (prevents data loss)', async () => {
    mockedStorage.getItem.mockResolvedValue('not-json');
    await expect(
      createEntry({ title: 'New', content: [{ id: 'b1', type: 'text', content: 'x' }] })
    ).rejects.toBeInstanceOf(CorruptStorageError);
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves entry with generated id and timestamps', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockedStorage.setItem.mockResolvedValue(undefined);
    mockedStorage.removeItem.mockResolvedValue(undefined);

    const entry = await createEntry({
      title: 'Test',
      content: [{ id: 'b1', type: 'text', content: 'Hello world' }],
    });

    expect(entry.id).toBeTruthy();
    expect(entry.title).toBe('Test');
    expect(entry.createdAt).toBeTruthy();
    expect(entry.previewText).toBe('Hello world');
    expect(mockedStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('extracts preview images from image blocks', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockedStorage.setItem.mockResolvedValue(undefined);
    mockedStorage.removeItem.mockResolvedValue(undefined);

    const entry = await createEntry({
      title: '',
      content: [
        { id: 'b1', type: 'image', content: 'file:///img1.jpg' },
        { id: 'b2', type: 'image', content: 'file:///img2.jpg' },
      ],
    });

    expect(entry.previewImages).toEqual(['file:///img1.jpg', 'file:///img2.jpg']);
  });

  it('detects audio blocks', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockedStorage.setItem.mockResolvedValue(undefined);
    mockedStorage.removeItem.mockResolvedValue(undefined);

    const entry = await createEntry({
      title: '',
      content: [{ id: 'b1', type: 'audio', content: 'file:///audio.m4a' }],
    });

    expect(entry.hasAudio).toBe(true);
  });
});

describe('updateEntry', () => {
  it('updates content and recomputes preview', async () => {
    const existing = [
      {
        id: '1',
        title: 'Old',
        content: [{ id: 'b1', type: 'text', content: 'old text' }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        previewText: 'old text',
      },
    ];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const updated = await updateEntry('1', {
      content: [{ id: 'b1', type: 'text', content: 'new text' }],
    });

    expect(updated?.previewText).toBe('new text');
    expect(updated?.updatedAt).not.toBe('2024-01-01T00:00:00Z');
  });

  it('returns null for non-existent entry', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    const result = await updateEntry('missing', { title: 'Nope' });
    expect(result).toBeNull();
  });
});

describe('toggleBookmark', () => {
  it('sets isBookmarked=true for an unbookmarked entry', async () => {
    const entries = [{ id: '1', content: [], createdAt: '2024-01-01T00:00:00Z' }];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const result = await toggleBookmark('1');

    expect(result).toBe(true);
    const saved = JSON.parse(mockedStorage.setItem.mock.calls[0][1] as string);
    expect(saved[0].isBookmarked).toBe(true);
    expect(saved[0].updatedAt).toBeTruthy();
  });

  it('sets isBookmarked=false for a bookmarked entry', async () => {
    const entries = [
      { id: '1', content: [], createdAt: '2024-01-01T00:00:00Z', isBookmarked: true },
    ];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const result = await toggleBookmark('1');

    expect(result).toBe(false);
    const saved = JSON.parse(mockedStorage.setItem.mock.calls[0][1] as string);
    expect(saved[0].isBookmarked).toBe(false);
  });

  it('returns null when entry does not exist', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    const result = await toggleBookmark('missing');
    expect(result).toBeNull();
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('deleteEntry', () => {
  it('removes entry from storage and returns true', async () => {
    const existing = [
      { id: '1', content: [], createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', content: [], createdAt: '2024-02-01T00:00:00Z' },
    ];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const result = await deleteEntry('1');
    expect(result).toBe(true);

    const savedData = JSON.parse(mockedStorage.setItem.mock.calls[0][1] as string);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].id).toBe('2');
  });

  it('returns false when the id does not exist (no storage write)', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([]));
    const result = await deleteEntry('missing');
    expect(result).toBe(false);
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it('writes storage BEFORE attempting media cleanup (no broken-reference window)', async () => {
    const callOrder: string[] = [];
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([
      { id: '1', content: [{ type: 'image', content: 'file:///x.jpg' }], createdAt: '2024-01-01T00:00:00Z' },
    ]));
    mockedStorage.setItem.mockImplementation(async () => { callOrder.push('setItem'); });
    (deleteMediaFile as jest.Mock).mockImplementation(async () => { callOrder.push('deleteMedia'); });

    await deleteEntry('1');
    expect(callOrder).toEqual(['setItem', 'deleteMedia']);
  });

  it('returns false when storage write fails (does not delete media)', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([
      { id: '1', content: [{ type: 'image', content: 'file:///x.jpg' }], createdAt: '2024-01-01T00:00:00Z' },
    ]));
    mockedStorage.setItem.mockRejectedValue(new Error('disk full'));

    const result = await deleteEntry('1');
    expect(result).toBe(false);
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });
});

describe('mergeEntries', () => {
  it('adds new entries that do not collide with existing ids', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([
      { id: 'a', content: [], createdAt: '2024-01-01T00:00:00Z' },
    ]));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const incoming = [
      { id: 'b', title: '', content: [], createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
      { id: 'c', title: '', content: [], createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
    ];
    const result = await mergeEntries(incoming);
    expect(result).toEqual({ added: 2, skipped: 0 });

    const saved = JSON.parse(mockedStorage.setItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(3);
    // Sorted newest-first
    expect(saved.map((e: any) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('skips incoming entries whose ids already exist (no overwrite)', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([
      { id: 'a', title: 'original', content: [], createdAt: '2024-01-01T00:00:00Z' },
    ]));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const result = await mergeEntries([
      { id: 'a', title: 'IMPOSTER', content: [], createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    ]);
    expect(result).toEqual({ added: 0, skipped: 1 });
    // Original was not modified — no write needed
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it('reports mixed added/skipped when only some incoming ids collide', async () => {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify([
      { id: 'a', content: [], createdAt: '2024-01-01T00:00:00Z' },
    ]));
    mockedStorage.setItem.mockResolvedValue(undefined);

    const result = await mergeEntries([
      { id: 'a', title: '', content: [], createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
      { id: 'b', title: '', content: [], createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    ]);
    expect(result).toEqual({ added: 1, skipped: 1 });
  });
});

describe('formatDate', () => {
  // Pin "now" to a fixed local-noon timestamp so tests are deterministic
  // regardless of when CI runs or what timezone the host is in.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 28, 12, 0, 0)); // May 28 2026, 12:00 local
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Today" when the entry was created earlier in the same calendar day', () => {
    const earlierToday = new Date(2026, 4, 28, 1, 0, 0).toISOString();
    expect(formatDate(earlierToday)).toBe('Today');
  });

  it('returns "Yesterday" for the previous calendar day even when less than 24h apart', () => {
    // 23:00 yesterday → only 13h before "now" but a different calendar day
    const lateYesterday = new Date(2026, 4, 27, 23, 0, 0).toISOString();
    expect(formatDate(lateYesterday)).toBe('Yesterday');
  });

  it('returns a weekday name for entries within the past week', () => {
    const threeDaysAgo = new Date(2026, 4, 25, 10, 0, 0).toISOString();
    const result = formatDate(threeDaysAgo);
    expect(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).toContain(result);
  });

  it('returns full date for entries older than a week', () => {
    const twoWeeksAgo = new Date(2026, 4, 14, 10, 0, 0).toISOString();
    expect(formatDate(twoWeeksAgo)).toMatch(/[A-Z][a-z]+,\s+[A-Z][a-z]+\s+\d+/);
  });
});
