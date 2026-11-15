export type MediaItem = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  type: 'audio' | 'video';
  color: string;
  uri: string;
  durationSec: number;
  added: number;
};
