import { useEffect, useState } from "react";

const STORAGE_KEY = "haven:guestFavorites";
const CHANGE_EVENT = "haven:guest-favorites-changed";

export function readGuestFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeGuestFavoriteIds(ids: string[]) {
  try {
    if (ids.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private modes; the in-memory state still works.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function toggleGuestFavorite(id: string): string[] {
  const current = readGuestFavoriteIds();
  const next = current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id];
  writeGuestFavoriteIds(next);
  return next;
}

export function clearGuestFavoriteIds() {
  writeGuestFavoriteIds([]);
}

export function useGuestFavoriteCount() {
  const [count, setCount] = useState(() => readGuestFavoriteIds().length);

  useEffect(() => {
    const update = () => setCount(readGuestFavoriteIds().length);
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return count;
}