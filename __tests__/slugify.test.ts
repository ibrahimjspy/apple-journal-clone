import { slugify, buildEntryFolderName } from '../utils/slugify';

describe('slugify', () => {
  it('returns "untitled" for empty input', () => {
    expect(slugify('')).toBe('untitled');
  });

  it('returns "untitled" for whitespace-only input', () => {
    expect(slugify('   ')).toBe('untitled');
  });

  it('lowercases and hyphenates a normal title', () => {
    expect(slugify('My First Entry')).toBe('my-first-entry');
  });

  it('strips special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('strips emoji', () => {
    expect(slugify('My day 🎉 was great')).toBe('my-day-was-great');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(slugify('foo   --   bar')).toBe('foo-bar');
  });

  it('strips diacritics', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('caps length at 50 characters', () => {
    const longTitle = 'this is a really long title that should definitely be truncated because it exceeds the limit';
    const result = slugify(longTitle);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).not.toMatch(/-$/);
  });

  it('returns "untitled" if input has no valid characters', () => {
    expect(slugify('!!!@@@###')).toBe('untitled');
  });

  it('handles numbers', () => {
    expect(slugify('2026 Recap')).toBe('2026-recap');
  });
});

describe('buildEntryFolderName', () => {
  it('prefixes slug with YYYY-MM-DD and appends short id suffix', () => {
    // shortIdSuffix takes last 6 alphanumeric chars of the id
    expect(
      buildEntryFolderName('My Entry', '2026-05-28T14:30:00.000Z', '1738086600000-abc123x')
    ).toBe('2026-05-28_my-entry__bc123x');
  });

  it('produces distinct folder names for entries that share title and day', () => {
    const a = buildEntryFolderName('Same Title', '2026-05-28', '1-aaaaaa');
    const b = buildEntryFolderName('Same Title', '2026-05-28', '2-bbbbbb');
    expect(a).not.toBe(b);
  });

  it('uses "untitled" slug when title is empty but still includes suffix', () => {
    const name = buildEntryFolderName('', '2026-05-28T00:00:00.000Z', '99-xyz999');
    expect(name).toMatch(/^2026-05-28_untitled__/);
    expect(name).not.toBe('2026-05-28_untitled');
  });

  it('handles ISO dates with only the date portion', () => {
    expect(buildEntryFolderName('Test', '2026-01-01', '5-qwerty')).toMatch(/^2026-01-01_test__/);
  });

  it('falls back to "noid" suffix when id is missing alphanumerics', () => {
    expect(buildEntryFolderName('x', '2026-05-28', '----')).toBe('2026-05-28_x__noid');
  });
});
