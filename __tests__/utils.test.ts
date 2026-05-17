import { generateId } from '../utils/id';
import { formatDurationMs, formatDurationSecs } from '../utils/time';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(generateId()).toBeTruthy();
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('starts with a timestamp', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();
    const ts = parseInt(id.split('-')[0], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('formatDurationMs', () => {
  it('formats zero', () => {
    expect(formatDurationMs(0)).toBe('0:00');
  });

  it('formats sub-minute durations', () => {
    expect(formatDurationMs(5000)).toBe('0:05');
    expect(formatDurationMs(59000)).toBe('0:59');
  });

  it('formats multi-minute durations', () => {
    expect(formatDurationMs(90000)).toBe('1:30');
    expect(formatDurationMs(600000)).toBe('10:00');
  });

  it('floors partial seconds', () => {
    expect(formatDurationMs(1500)).toBe('0:01');
  });
});

describe('formatDurationSecs', () => {
  it('formats zero', () => {
    expect(formatDurationSecs(0)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatDurationSecs(65)).toBe('1:05');
    expect(formatDurationSecs(3600)).toBe('60:00');
  });
});
