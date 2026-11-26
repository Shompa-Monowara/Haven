import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export interface SetPageOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

export type SetPage = (page: number, options?: SetPageOptions) => void;

/**
 * Reads and writes `?page=` in the URL. Missing or invalid values resolve to 1,
 * all other search params are preserved, and changes push history by default so
 * the browser Back button works.
 */
export function usePageParam(): [number, SetPage] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("page");
  const numeric = raw !== null ? Number(raw) : Number.NaN;
  const page = Number.isInteger(numeric) && numeric >= 1 ? numeric : 1;

  const setPage = useCallback<SetPage>(
    (next, options) => {
      const target = Number.isInteger(next) && next >= 1 ? next : 1;

      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (target <= 1) params.delete("page");
          else params.set("page", String(target));
          return params;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  return [page, setPage];
}