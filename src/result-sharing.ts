export const GAME_URL = 'https://cadmium2525.github.io/seesaw_jump/';

export function buildShareText(result: { height: number; catches: number }): string {
  return `SEESAWで ${result.height.toFixed(1)} m までジャンプ！\nキャッチ ${result.catches} 回\n\n#SEESAW #シーソージャンプ\n${GAME_URL}`;
}

export interface SharePlatform {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  copyText: (text: string) => Promise<void>;
  download: (file: File) => void;
}

export type ShareOutcome =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'fallback'; copied: boolean };

/** A prepared file lets the native share sheet open within the click gesture. */
export async function shareResult(file: File, text: string, platform: SharePlatform): Promise<ShareOutcome> {
  const payload: ShareData = {
    title: 'SEESAW — 空まで、もう一回。',
    text,
    files: [file],
  };

  let canShareFile = false;
  if (platform.canShare && platform.share) {
    try {
      canShareFile = platform.canShare(payload);
    } catch {
      // Some browsers expose canShare but throw for file payloads.
    }
  }

  if (canShareFile && platform.share) {
    try {
      // Do not add an await before this call: sharing requires user activation.
      await platform.share(payload);
      return { kind: 'shared' };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
        return { kind: 'cancelled' };
      }
    }
  }

  // Start both gesture-sensitive fallbacks before awaiting the clipboard. A
  // rejected clipboard permission must never prevent the image download.
  let copying: Promise<boolean>;
  try {
    copying = platform.copyText(text).then(() => true, () => false);
  } catch {
    copying = Promise.resolve(false);
  }
  platform.download(file);
  return { kind: 'fallback', copied: await copying };
}
