import {
  buildManifest,
  buildEntryJson,
  buildEntryMarkdown,
  parseManifest,
  parseEntryJson,
  BACKUP_FORMAT_VERSION,
} from '../services/backup';
import { JournalEntry } from '../types/journal';

const sampleEntry: JournalEntry = {
  id: 'entry-1',
  title: 'Hello World',
  isBookmarked: true,
  createdAt: '2026-05-28T14:30:00.000Z',
  updatedAt: '2026-05-28T15:00:00.000Z',
  content: [
    { id: 'b1', type: 'text', content: 'My first entry.' },
    {
      id: 'b2',
      type: 'image',
      content: 'file:///media/images/xyz.jpg',
      imageData: { id: 'i1', uri: 'file:///x.jpg', width: 800, height: 600 },
    },
    {
      id: 'b3',
      type: 'audio',
      content: 'file:///media/audio/abc.m4a',
      audioData: { id: 'a1', uri: 'file:///x.m4a', duration: 12000, waveform: [0.3, 0.7], createdAt: '...' },
    },
  ],
};

describe('buildManifest', () => {
  it('uses current format version', () => {
    const manifest = buildManifest([sampleEntry], '1.0.0');
    expect(manifest.version).toBe(BACKUP_FORMAT_VERSION);
  });

  it('embeds the app version', () => {
    const manifest = buildManifest([], '2.5.1');
    expect(manifest.appVersion).toBe('2.5.1');
  });

  it('generates a folder name per entry', () => {
    const manifest = buildManifest([sampleEntry], '1.0.0');
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].folderName).toBe('2026-05-28_hello-world');
  });

  it('sets exportedAt to a valid ISO timestamp', () => {
    const manifest = buildManifest([], '1.0.0');
    expect(() => new Date(manifest.exportedAt).toISOString()).not.toThrow();
  });
});

describe('buildEntryJson', () => {
  it('preserves text blocks verbatim', () => {
    const json = buildEntryJson(sampleEntry);
    expect(json.blocks[0]).toEqual({ type: 'text', content: 'My first entry.' });
  });

  it('rewrites media block content to relative paths', () => {
    const json = buildEntryJson(sampleEntry);
    expect(json.blocks[1]).toMatchObject({
      type: 'image',
      file: 'images/01.jpg',
      width: 800,
      height: 600,
    });
    expect(json.blocks[2]).toMatchObject({
      type: 'audio',
      file: 'audio/01.m4a',
      duration: 12000,
      waveform: [0.3, 0.7],
    });
  });

  it('captures bookmark flag', () => {
    const json = buildEntryJson(sampleEntry);
    expect(json.isBookmarked).toBe(true);
  });

  it('defaults isBookmarked to false when not set', () => {
    const json = buildEntryJson({ ...sampleEntry, isBookmarked: undefined });
    expect(json.isBookmarked).toBe(false);
  });
});

describe('buildEntryMarkdown', () => {
  it('starts with the title as an H1', () => {
    const md = buildEntryMarkdown(sampleEntry);
    expect(md).toMatch(/^# Hello World/);
  });

  it('falls back to "Untitled" for empty title', () => {
    const md = buildEntryMarkdown({ ...sampleEntry, title: '' });
    expect(md).toMatch(/^# Untitled/);
  });

  it('includes the date below the title', () => {
    const md = buildEntryMarkdown(sampleEntry);
    expect(md).toContain('_2026-05-28_');
  });

  it('marks bookmarked entries', () => {
    const md = buildEntryMarkdown(sampleEntry);
    expect(md).toContain('⭐ Bookmarked');
  });

  it('embeds image references as markdown', () => {
    const md = buildEntryMarkdown(sampleEntry);
    expect(md).toContain('![image 1](images/01.jpg)');
  });

  it('embeds audio references with duration', () => {
    const md = buildEntryMarkdown(sampleEntry);
    expect(md).toContain('🎙️ [Voice note (0:12)](audio/01.m4a)');
  });
});

describe('parseManifest', () => {
  it('round-trips with buildManifest', () => {
    const built = buildManifest([sampleEntry], '1.0.0');
    const parsed = parseManifest(JSON.stringify(built));
    expect(parsed).toEqual(built);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseManifest('not json')).toThrow(/Invalid manifest/);
  });

  it('throws when version is missing', () => {
    expect(() => parseManifest('{"entries":[]}')).toThrow(/version/);
  });

  it('throws when entries is not an array', () => {
    expect(() => parseManifest('{"version":1,"entries":"oops"}')).toThrow(/entries/);
  });

  it('rejects future format versions', () => {
    expect(() => parseManifest('{"version":99,"entries":[]}')).toThrow(/newer than this app supports/);
  });

  it('rejects entries missing id', () => {
    expect(() =>
      parseManifest('{"version":1,"entries":[{"folderName":"x"}]}')
    ).toThrow(/entry/);
  });
});

describe('parseEntryJson', () => {
  it('round-trips with buildEntryJson', () => {
    const built = buildEntryJson(sampleEntry);
    const parsed = parseEntryJson(JSON.stringify(built));
    expect(parsed).toEqual(built);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseEntryJson('xxx')).toThrow(/Invalid entry.json/);
  });

  it('throws when block has unsupported type', () => {
    const bad = JSON.stringify({
      id: 'x',
      blocks: [{ type: 'video', file: 'v.mp4' }],
    });
    expect(() => parseEntryJson(bad)).toThrow(/unsupported type/);
  });

  it('coerces missing optional fields to defaults', () => {
    const minimal = JSON.stringify({
      id: 'x',
      blocks: [{ type: 'text', content: 'hi' }],
    });
    const parsed = parseEntryJson(minimal);
    expect(parsed.title).toBe('');
    expect(parsed.isBookmarked).toBe(false);
  });
});
