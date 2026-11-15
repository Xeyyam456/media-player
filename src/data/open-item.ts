import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePlayer } from './player';
import type { MediaItem } from './types';

/** Audio → oxudur və tam ekran pleyeri açır, video → video ekranını açır (səsi dayandırır). */
export function useOpenItem() {
  const router = useRouter();
  const { playItem, pause } = usePlayer();

  return useCallback(
    (item: MediaItem, list: MediaItem[]) => {
      if (item.type === 'video') {
        pause();
        router.push({ pathname: '/video', params: { id: item.id } });
      } else {
        playItem(item, list);
        router.push('/player');
      }
    },
    [playItem, pause, router],
  );
}
