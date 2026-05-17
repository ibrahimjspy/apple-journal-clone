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
  formatDate,
} from '../services/storage';

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

  it('returns empty array on parse error', async () => {
    mockedStorage.getItem.mockResolvedValue('not-json');
    const entries = await getEntries();
    expect(entries).toEqual([]);
  });
});

describe('createEntry', () => {
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

describe('deleteEntry', () => {
  it('removes entry from storage', async () => {
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
});

describe('formatDate', () => {
  it('returns "Today" for current date', () => {
    const now = new Date().toISOString();
    expect(formatDate(now)).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(formatDate(yesterday)).toBe('Yesterday');
  });

  it('returns weekday name for recent dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const result = formatDate(threeDaysAgo);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(weekdays).toContain(result);
  });
});
