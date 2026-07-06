import { describe, expect, it } from 'vitest';
import { defaultCreatorForm, encodeUrlLines, isLibtorrent2, PIECE_SIZES, pieceSizeLabel, taskParams, torrentFileName } from '../../src/features/tools/creator';

describe('torrent creator form', () => {
  it('offers Auto and 16 KiB to 128 MiB piece sizes, labelled in binary units', () => {
    expect(PIECE_SIZES).toHaveLength(15);
    expect([PIECE_SIZES[0], PIECE_SIZES[1], PIECE_SIZES.at(-1)]).toEqual([0, 16 * 1024, 128 * 1024 * 1024]);
    expect([pieceSizeLabel(0), pieceSizeLabel(16 * 1024), pieceSizeLabel(4 * 1024 * 1024)]).toEqual(['Automatic', '16 KiB', '4 MiB']);
  });

  it('tells libtorrent 2 from 1 by the build’s version', () => {
    expect([isLibtorrent2('2.0.10.0'), isLibtorrent2('1.2.20.0'), isLibtorrent2('')]).toEqual([true, false, true]);
  });

  it('encodes each URL line and keeps blank lines between tracker tiers', () => {
    expect(encodeUrlLines('udp://a.example:80/announce\n\n  https://b.example/announce?x=1&y=2|z \n\n')).toBe(
      'udp%3A%2F%2Fa.example%3A80%2Fannounce||https%3A%2F%2Fb.example%2Fannounce%3Fx%3D1%26y%3D2%7Cz',
    );
    expect(encodeUrlLines('  \n ')).toBe('');
  });

  it('sends libtorrent 1 options only to libtorrent 1, and the format only to libtorrent 2', () => {
    const form = { ...defaultCreatorForm(), sourcePath: '/data/share', trackers: 'udp://a', comment: '  ', private: true };
    expect(taskParams(form, false)).toEqual({ sourcePath: '/data/share', pieceSize: 0, private: true, startSeeding: true, optimizeAlignment: true, paddedFileSizeLimit: -1, trackers: 'udp%3A%2F%2Fa' });
    expect(taskParams({ ...form, padFiles: true, paddedFileSizeLimitKiB: 64 }, false)).toMatchObject({ paddedFileSizeLimit: 64 });
    expect(taskParams(form, true)).toEqual({ sourcePath: '/data/share', pieceSize: 0, private: true, startSeeding: true, format: 'hybrid', trackers: 'udp%3A%2F%2Fa' });
  });

  it('names the downloaded .torrent after the source', () => {
    expect([torrentFileName('/data/share/'), torrentFileName('/data/movie.mkv'), torrentFileName('')]).toEqual(['share.torrent', 'movie.mkv.torrent', 'torrent.torrent']);
  });
});
