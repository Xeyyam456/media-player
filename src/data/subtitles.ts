export type Cue = { start: number; end: number; text: string };

function toSec(h: string, m: string, s: string, ms: string) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;
}

/** SRT və sadə WebVTT formatlarını oxuyur. */
export function parseSubtitles(raw: string): Cue[] {
  const text = raw.replace(/^﻿/, '').replace(/\r/g, '');
  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  const re = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

  for (const block of blocks) {
    const lines = block.split('\n');
    const idx = lines.findIndex((l) => re.test(l));
    if (idx < 0) continue;
    const m = re.exec(lines[idx] ?? '');
    if (!m) continue;
    const start = toSec(m[1] ?? '0', m[2] ?? '0', m[3] ?? '0', m[4] ?? '0');
    const end = toSec(m[5] ?? '0', m[6] ?? '0', m[7] ?? '0', m[8] ?? '0');
    const body = lines
      .slice(idx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .trim();
    if (body) cues.push({ start, end, text: body });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** Verilmiş vaxta uyğun alt yazını tapır (binar axtarış). */
export function cueAt(cues: Cue[], t: number): Cue | null {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (!c) return null;
    if (t < c.start) hi = mid - 1;
    else if (t > c.end) lo = mid + 1;
    else return c;
  }
  return null;
}
