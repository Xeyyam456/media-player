import { requireOptionalNativeModule } from 'expo';

export type Meta = { title: string | null; artist: string | null; album: string | null; art: string | null };

type Native = { getMeta(uri: string, withArt: boolean): Promise<Meta> };

// Köhnə build-də modul olmaya bilər — tətbiq çökmür, sadəcə məlumat gəlmir
const native = requireOptionalNativeModule<Native>('MediaMeta');

export const hasMediaMeta = native != null;

export async function getMeta(uri: string, withArt = false): Promise<Meta> {
  if (!native) return { title: null, artist: null, album: null, art: null };
  return native.getMeta(uri, withArt);
}
