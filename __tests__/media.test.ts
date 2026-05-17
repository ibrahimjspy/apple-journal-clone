import * as FileSystem from 'expo-file-system';

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///data/user/0/com.app/files/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const mockedFS = FileSystem as jest.Mocked<typeof FileSystem>;

import { saveImageToLocal, saveAudioToLocal, deleteMediaFile } from '../services/media';

beforeEach(() => {
  jest.clearAllMocks();
  (mockedFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
  (mockedFS.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
  (mockedFS.copyAsync as jest.Mock).mockResolvedValue(undefined);
  (mockedFS.deleteAsync as jest.Mock).mockResolvedValue(undefined);
});

describe('saveImageToLocal', () => {
  it('copies image to images directory and returns new URI', async () => {
    const result = await saveImageToLocal('file:///tmp/photo.jpg');
    expect(mockedFS.copyAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'file:///tmp/photo.jpg',
        to: expect.stringContaining('media/images/'),
      })
    );
    expect(result).toContain('media/images/');
    expect(result).toMatch(/\.jpg$/);
  });

  it('creates directories if they do not exist', async () => {
    (mockedFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    await saveImageToLocal('file:///tmp/photo.png');
    expect(mockedFS.makeDirectoryAsync).toHaveBeenCalled();
  });

  it('throws on copy failure', async () => {
    (mockedFS.copyAsync as jest.Mock).mockRejectedValue(new Error('disk full'));
    await expect(saveImageToLocal('file:///tmp/photo.jpg')).rejects.toThrow('disk full');
  });
});

describe('saveAudioToLocal', () => {
  it('copies audio to audio directory and returns new URI', async () => {
    const result = await saveAudioToLocal('file:///tmp/recording.m4a');
    expect(mockedFS.copyAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'file:///tmp/recording.m4a',
        to: expect.stringContaining('media/audio/'),
      })
    );
    expect(result).toContain('media/audio/');
    expect(result).toMatch(/\.m4a$/);
  });
});

describe('deleteMediaFile', () => {
  it('deletes file that exists under documentDirectory', async () => {
    (mockedFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    await deleteMediaFile('file:///data/user/0/com.app/files/media/images/test.jpg');
    expect(mockedFS.deleteAsync).toHaveBeenCalled();
  });

  it('skips files outside documentDirectory', async () => {
    await deleteMediaFile('file:///tmp/external.jpg');
    expect(mockedFS.deleteAsync).not.toHaveBeenCalled();
  });

  it('skips files that do not exist', async () => {
    (mockedFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    await deleteMediaFile('file:///data/user/0/com.app/files/media/images/gone.jpg');
    expect(mockedFS.deleteAsync).not.toHaveBeenCalled();
  });

  it('does not throw on delete error', async () => {
    (mockedFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (mockedFS.deleteAsync as jest.Mock).mockRejectedValue(new Error('perm denied'));
    await expect(
      deleteMediaFile('file:///data/user/0/com.app/files/media/images/test.jpg')
    ).resolves.not.toThrow();
  });
});
