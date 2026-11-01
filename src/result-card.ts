/** Portable score artwork: no WebGL capture, external image, or font is needed. */
export interface ResultCardData {
  height: number;
  catches: number;
  best: number;
  newRecord: boolean;
}

const WIDTH = 1200;
const HEIGHT = 900;
const PAD = 64;
const FONT = '"Avenir Next", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, Arial, sans-serif';
const COLOR = {
  paper: '#f4f3e9', ink: '#233e3b', coral: '#e87759', muted: '#687d71',
  sage: '#c9d3b5', grass: '#b8c8a2', mustard: '#ddb451', cream: '#fff7dc',
  skin: '#edc3a0', line: '#d2d8c9', light: '#e6eacb',
};

const metres = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nonnegative = (value: number): number => Number.isFinite(value) ? Math.max(0, value) : 0;

function font(ctx: CanvasRenderingContext2D, size: number, weight = 700): void {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function fittedText(
  ctx: CanvasRenderingContext2D, text: string, x: number, baseline: number,
  maxWidth: number, maxSize: number, minSize = 30, weight = 700,
): number {
  let size = maxSize;
  font(ctx, size, weight);
  const width = ctx.measureText(text).width;
  if (width > maxWidth) {
    size = Math.max(minSize, size * maxWidth / width);
    font(ctx, size, weight);
  }
  ctx.fillText(text, x, baseline, maxWidth);
  return ctx.measureText(text).width;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, points: number[], color: string, width: number): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, pupilX = 0): void {
  ellipse(ctx, x, y, radius, radius * .88, COLOR.cream);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = Math.max(3, radius * .075);
  ctx.stroke();
  ellipse(ctx, x + pupilX, y - radius * .06, radius * .37, radius * .43, COLOR.ink);
  ellipse(ctx, x + pupilX - radius * .1, y - radius * .23, radius * .1, radius * .11, COLOR.cream);
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-65, 17);
  ctx.bezierCurveTo(-87, 17, -83, -13, -59, -13);
  ctx.bezierCurveTo(-59, -45, -12, -50, -3, -21);
  ctx.bezierCurveTo(22, -39, 52, -22, 50, -2);
  ctx.bezierCurveTo(80, -6, 83, 23, 59, 23);
  ctx.lineTo(-65, 23);
  ctx.fillStyle = '#fffdf4';
  ctx.fill();
  ctx.restore();
}

function person(ctx: CanvasRenderingContext2D, x: number, y: number, shirt: string, airborne: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  if (airborne) ctx.rotate(.16);
  // y is the feet position. Art remains entirely inside the illustration band.
  if (airborne) {
    line(ctx, [-8, -22, -10, -3, -21, -3], COLOR.ink, 9);
    line(ctx, [8, -22, 14, -4, 25, -4], COLOR.ink, 9);
  } else {
    line(ctx, [-8, -22, 7, -16, 12, -2, 22, -2], COLOR.ink, 9);
    line(ctx, [8, -22, 22, -16, 27, -1, 37, -1], COLOR.ink, 9);
  }
  roundedRect(ctx, -17, -58, 34, 39, 12);
  ctx.fillStyle = shirt;
  ctx.fill();
  if (airborne) {
    line(ctx, [-12, -48, -27, -65, -32, -82], COLOR.skin, 8);
    line(ctx, [13, -48, 28, -65, 33, -81], COLOR.skin, 8);
  } else {
    line(ctx, [-12, -48, -24, -30, -34, -27], COLOR.skin, 8);
    line(ctx, [13, -48, 27, -30, 36, -27], COLOR.skin, 8);
  }
  ellipse(ctx, 0, -75, 16, 18, COLOR.skin);
  ctx.beginPath();
  ctx.ellipse(0, -82, 17, 12, -.1, Math.PI, Math.PI * 2.15);
  ctx.fillStyle = COLOR.ink;
  ctx.fill();
  ellipse(ctx, 6, -75, 1.7, 2.1, COLOR.ink);
  ellipse(ctx, -4, -75, 1.7, 2.1, COLOR.ink);
  ctx.restore();
}

function illustration(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Clip the artwork separately so no decorative feature can cross a stat or URL.
  ctx.beginPath();
  ctx.rect(PAD, 588, WIDTH - PAD * 2, 148);
  ctx.clip();
  cloud(ctx, 183, 632, .78);
  cloud(ctx, 1012, 630, .88);
  ctx.beginPath();
  ctx.moveTo(PAD, 736);
  ctx.lineTo(PAD, 713);
  ctx.bezierCurveTo(201, 653, 337, 692, 486, 714);
  ctx.bezierCurveTo(664, 666, 848, 667, WIDTH - PAD, 710);
  ctx.lineTo(WIDTH - PAD, 736);
  ctx.closePath();
  ctx.fillStyle = COLOR.sage;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(PAD, 736);
  ctx.lineTo(PAD, 727);
  ctx.bezierCurveTo(345, 695, 497, 738, 710, 717);
  ctx.bezierCurveTo(928, 693, 1021, 720, WIDTH - PAD, 717);
  ctx.lineTo(WIDTH - PAD, 736);
  ctx.fillStyle = COLOR.grass;
  ctx.fill();
  ellipse(ctx, 600, 727, 183, 9, '#97ac8c');

  // Six legs, the distinctive single eye, and the long lever echo the game model.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const rootX = 600 + side * (24 + i * 3);
      const kneeX = 600 + side * (66 + i * 17);
      const footX = 600 + side * (83 + i * 24);
      const footY = 723 + i * 2;
      line(ctx, [rootX, 694 + i * 5, kneeX, 691 + i * 3, footX, footY], COLOR.coral, 8);
      ellipse(ctx, kneeX, 691 + i * 3, 6, 6, COLOR.mustard);
      line(ctx, [footX - 7, footY, footX + 7, footY], COLOR.ink, 7);
    }
  }
  ellipse(ctx, 600, 695, 50, 35, COLOR.coral);
  ctx.save();
  ctx.translate(600, 671);
  ctx.rotate(-.075);
  roundedRect(ctx, -225, -9, 450, 20, 5);
  ctx.fillStyle = COLOR.mustard;
  ctx.fill();
  roundedRect(ctx, -225, -12, 450, 7, 3);
  ctx.fillStyle = COLOR.coral;
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = COLOR.cream;
    ctx.fillRect(side * 203 - 3, -12, 6, 22);
    line(ctx, [side * 174, -12, side * 174, -37, side * 163, -37], COLOR.ink, 4);
  }
  ctx.restore();
  person(ctx, 424, 704, COLOR.coral, false);
  person(ctx, 852, 684, COLOR.mustard, true);
  ellipse(ctx, 600, 695, 42, 38, COLOR.mustard);
  eye(ctx, 600, 695, 34, 4);
  // A few meadow flowers provide scale without crowding the results.
  for (const [x, y, color] of [[277, 718, COLOR.cream], [305, 727, COLOR.coral], [936, 721, COLOR.mustard], [977, 728, COLOR.cream]] as const) {
    line(ctx, [x, y, x, y - 13], COLOR.muted, 2.5);
    ellipse(ctx, x, y - 15, 5, 4, color);
  }
  ctx.restore();
}

/** Draw a complete 1200×900 card into an existing, untransformed 2D context. */
export function drawResultCard(ctx: CanvasRenderingContext2D, data: ResultCardData): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLOR.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  eye(ctx, 91, 103, 26, 2);
  ctx.fillStyle = COLOR.ink;
  fittedText(ctx, 'SEESAW', 139, 121, 430, 62, 54, 800);
  ctx.fillStyle = COLOR.muted;
  fittedText(ctx, '空まで、もう一回。', 140, 161, 460, 30, 28, 600);

  if (data.newRecord) {
    roundedRect(ctx, 768, 73, 368, 73, 36);
    ctx.fillStyle = COLOR.coral;
    ctx.fill();
    ctx.fillStyle = COLOR.ink;
    ctx.textAlign = 'center';
    fittedText(ctx, 'NEW RECORD', 952, 122, 324, 42, 36, 800);
    ctx.textAlign = 'left';
  }
  line(ctx, [PAD, 183, WIDTH - PAD, 183], COLOR.line, 2);

  ctx.fillStyle = COLOR.ink;
  fittedText(ctx, '今回の最高到達点', PAD, 260, WIDTH - PAD * 2, 68, 64, 700);
  const height = metres.format(nonnegative(data.height));
  const unitSize = 64;
  font(ctx, unitSize, 600);
  const unitWidth = ctx.measureText('m').width;
  const numberWidth = fittedText(ctx, height, PAD - 3, 397, WIDTH - PAD * 2 - unitWidth - 26, 148, 60, 750);
  font(ctx, unitSize, 600);
  ctx.fillText('m', PAD + numberWidth + 20, 393);
  line(ctx, [PAD, 432, WIDTH - PAD, 432], COLOR.line, 2);

  ctx.fillStyle = COLOR.muted;
  fittedText(ctx, 'キャッチ', PAD, 501, 440, 68, 64, 650);
  fittedText(ctx, '自己ベスト', 656, 501, 480, 68, 64, 650);
  ctx.fillStyle = COLOR.ink;
  fittedText(ctx, `${integers.format(Math.floor(nonnegative(data.catches)))} 回`, PAD, 578, 460, 68, 42, 750);
  fittedText(ctx, `${metres.format(Math.max(nonnegative(data.best), nonnegative(data.height)))} m`, 656, 578, 480, 68, 38, 750);
  line(ctx, [600, 463, 600, 565], COLOR.line, 2);

  illustration(ctx);
  line(ctx, [PAD, 751, WIDTH - PAD, 751], COLOR.line, 2);
  ctx.fillStyle = COLOR.ink;
  fittedText(ctx, 'https://cadmium2525.github.io/seesaw_jump/', PAD, 784, WIDTH - PAD * 2, 40, 36, 600);
  ctx.fillStyle = COLOR.muted;
  fittedText(ctx, '#SEESAW  #シーソージャンプ', PAD, 828, WIDTH - PAD * 2, 36, 32, 650);
  ctx.restore();
}

/** Create a PNG and a temporary preview URL; the caller owns URL.revokeObjectURL. */
export async function createResultCard(data: ResultCardData): Promise<{ blob: Blob; previewUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('スコアカードを作成できませんでした。');
  drawResultCard(ctx, data);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('スコアカードのPNG保存に失敗しました。')), 'image/png');
  });
  return { blob, previewUrl: URL.createObjectURL(blob) };
}
