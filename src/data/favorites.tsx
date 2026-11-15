import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'favorites.v1';

type Ctx = { ids: Set<string>; isFav: (id: string) => boolean; toggleFav: (id: string) => void };

const FavoritesContext = createContext<Ctx>({ ids: new Set(), isFav: () => false, toggleFav: () => {} });

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setIds(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  const toggleFav = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ ids, isFav: (id) => ids.has(id), toggleFav }), [ids, toggleFav]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
