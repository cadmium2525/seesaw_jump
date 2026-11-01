import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText, GAME_URL, shareResult, type SharePlatform } from '../src/result-sharing';

const file = new File([new Uint8Array([137, 80, 78, 71])], 'seesaw-result.png', { type: 'image/png' });
const text = buildShareText({ height: 123.456, catches: 7 });

function unexpectedFallback(): never {
  assert.fail('Native sharing must not trigger clipboard or download fallback.');
}

test('share caption includes rounded altitude, catches, hashtags, and the canonical game URL', () => {
  assert.match(text, /123\.5 m/);
  assert.match(text, /キャッチ 7 回/);
  assert.match(text, /#SEESAW #シーソージャンプ/);
  assert.ok(text.includes(GAME_URL));
  assert.equal(GAME_URL, 'https://cadmium2525.github.io/seesaw_jump/');
  assert.match(buildShareText({ height: 0, catches: 0 }), /0\.0 m/);
});

test('supported native sharing receives the image and caption together before the first await', async () => {
  const calls: string[] = [];
  const platform: SharePlatform = {
    canShare: data => {
      calls.push('canShare');
      assert.deepEqual(data, {
        title: 'SEESAW — 空まで、もう一回。', text, files: [file],
      });
      assert.equal('url' in data, false, 'The URL already appears in the caption.');
      return true;
    },
    share: data => {
      calls.push('share');
      assert.equal(data.files?.[0], file);
      assert.equal(data.text, text);
      return Promise.resolve();
    },
    copyText: unexpectedFallback,
    download: unexpectedFallback,
  };
  const result = shareResult(file, text, platform);
  assert.deepEqual(calls, ['canShare', 'share'], 'The native share call must retain click activation.');
  assert.deepEqual(await result, { kind: 'shared' });
});

test('cancelling the native share sheet has no clipboard or download side effect', async () => {
  const result = await shareResult(file, text, {
    canShare: () => true,
    share: () => Promise.reject(new DOMException('Cancelled', 'AbortError')),
    copyText: unexpectedFallback,
    download: unexpectedFallback,
  });
  assert.deepEqual(result, { kind: 'cancelled' });
});

test('unsupported image sharing copies the caption and downloads immediately before awaiting clipboard', async () => {
  const calls: string[] = [];
  let finishCopy!: () => void;
  const result = shareResult(file, text, {
    canShare: () => false,
    share: unexpectedFallback,
    copyText: caption => {
      assert.equal(caption, text);
      calls.push('copy');
      return new Promise<void>(resolve => { finishCopy = resolve; });
    },
    download: image => {
      assert.equal(image, file);
      calls.push('download');
    },
  });
  assert.deepEqual(calls, ['copy', 'download']);
  finishCopy();
  assert.deepEqual(await result, { kind: 'fallback', copied: true });
});

test('clipboard denial still downloads the result and reports selectable-caption fallback', async () => {
  let downloaded = false;
  const result = await shareResult(file, text, {
    copyText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    download: () => { downloaded = true; },
  });
  assert.equal(downloaded, true);
  assert.deepEqual(result, { kind: 'fallback', copied: false });
});

test('native sharing errors fall back to downloading and copying the same result', async () => {
  const calls: string[] = [];
  const result = await shareResult(file, text, {
    canShare: () => true,
    share: () => {
      calls.push('share');
      return Promise.reject(new DOMException('Unavailable', 'DataError'));
    },
    copyText: async () => { calls.push('copy'); },
    download: () => { calls.push('download'); },
  });
  assert.deepEqual(calls, ['share', 'copy', 'download']);
  assert.deepEqual(result, { kind: 'fallback', copied: true });
});

test('throwing file-support checks use the fallback instead of attempting text-only sharing', async () => {
  const calls: string[] = [];
  const result = await shareResult(file, text, {
    canShare: () => { throw new TypeError('Files are not supported'); },
    share: unexpectedFallback,
    copyText: async () => { calls.push('copy'); },
    download: () => { calls.push('download'); },
  });
  assert.deepEqual(calls, ['copy', 'download']);
  assert.deepEqual(result, { kind: 'fallback', copied: true });
});

test('a share method without file-support detection still uses image-download fallback', async () => {
  let downloaded = false;
  const result = await shareResult(file, text, {
    share: unexpectedFallback,
    copyText: async () => {},
    download: () => { downloaded = true; },
  });
  assert.equal(downloaded, true);
  assert.deepEqual(result, { kind: 'fallback', copied: true });
});

test('a synchronous clipboard error cannot prevent the image download', async () => {
  let downloaded = false;
  const result = await shareResult(file, text, {
    copyText: () => { throw new Error('Clipboard unavailable'); },
    download: () => { downloaded = true; },
  });
  assert.equal(downloaded, true);
  assert.deepEqual(result, { kind: 'fallback', copied: false });
});

test('download failures reject so the interface cannot falsely report a saved image', async () => {
  await assert.rejects(shareResult(file, text, {
    copyText: () => Promise.reject(new Error('Clipboard denied too')),
    download: () => { throw new Error('Download blocked'); },
  }), /Download blocked/);
});
