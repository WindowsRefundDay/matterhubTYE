"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDisplayState,
  postDisplayAction,
} from "@/lib/client/system-api";
import type { DisplayAction, DisplayState } from "@/types/system";

interface UseDisplayStateOptions {
  initialState?: DisplayState;
  pollMs?: number | null;
  refreshOnMount?: boolean;
}

export function useDisplayState({
  initialState,
  pollMs = 10000,
  refreshOnMount = true,
}: UseDisplayStateOptions = {}) {
  const [data, setData] = useState<DisplayState | null>(initialState ?? null);
  const [loading, setLoading] = useState(initialState ? false : refreshOnMount);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const nextState = await fetchDisplayState();
      setData(nextState);
      return nextState;
    } finally {
      setLoading(false);
    }
  }, []);

  const performAction = useCallback(async (action: DisplayAction) => {
    setBusy(true);
    try {
      const nextState = await postDisplayAction(action);
      setData(nextState);
      return nextState;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!refreshOnMount) {
      return;
    }

    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(initialRefresh);
    };
  }, [refresh, refreshOnMount]);

  useEffect(() => {
    if (pollMs == null || pollMs <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [pollMs, refresh]);

  return {
    data,
    setData,
    loading,
    busy,
    refresh,
    performAction,
  };
}
