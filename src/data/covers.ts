import { Asset } from 'expo-asset';

// Rənglər library.tsx-dəki PALETTE ilə eyni sıradadır
const PALETTE = ['#8B5CF6', '#6366F1', '#A855F7', '#EC4899', '#7C3AED', '#0EA5E9', '#14B8A6', '#F97316'];

const SOURCES = [
  require('../../assets/covers/cover-0.png'),
  require('../../assets/covers/cover-1.png'),
  require('../../assets/covers/cover-2.png'),
  require('../../assets/covers/cover-3.png'),
  require('../../assets/covers/cover-4.png'),
  require('../../assets/covers/cover-5.png'),
  require('../../assets/covers/cover-6.png'),
  require('../../assets/covers/cover-7.png'),
];

const cache = new Map<number, string>();

/** Albom şəkli olmayan mahnılar üçün bildiriş/kilid ekranında göstəriləcək örtük (fayl yolu). */
export async function coverUriFor(color: string): Promise<string | undefined> {
  const i = Math.max(0, PALETTE.indexOf(color));
  const hit = cache.get(i);
  if (hit) return hit;
  try {
    const asset = Asset.fromModule(SOURCES[i]);
    if (!asset.localUri) await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    cache.set(i, uri);
    return uri;
  } catch {
    return undefined;
  }
}
