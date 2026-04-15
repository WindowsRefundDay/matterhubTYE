"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchWifiStatus,
  postWifiAction,
} from "@/lib/client/system-api";
import type { WifiAction, WifiStatus } from "@/types/system";

interface PerformWifiActionOptions {
  refreshDelayMs?: number;
  refreshAfter?: boolean;
}

interface UseWifiStatusOptions {
  initialState?: WifiStatus;
  pollMs?: number | null;
  refreshOnMount?: boolean;
}

export function useWifiStatus({
  initialState,
  pollMs = 8000,
  refreshOnMount = true,
}: UseWifiStatusOptions = {}) {
  const [data, setData] = useState<WifiStatus | null>(initialState ?? null);
  const [loading, setLoading] = useState(initialState ? false : refreshOnMount);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const nextState = await fetchWifiStatus();
      setData(nextState);
      return nextState;
    } finally {
      setLoading(false);
    }
  }, []);

  const performAction = useCallback(
    async (
      action: WifiAction,
      { refreshDelayMs = 0, refreshAfter = true }: PerformWifiActionOptions = {},
    ) => {
      setBusy(true);
      try {
        const result = await postWifiAction(action);
        if (refreshAfter) {
          if (refreshDelayMs > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, refreshDelayMs));
          }
          await refresh();
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

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
