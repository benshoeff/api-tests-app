"use client";

import { useCallback, useEffect, useState } from "react";

export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
        setData(null);
      } else {
        setData(json.data);
      }
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, ...deps]);

  return { data, loading, error, refresh };
}

async function parseJsonSafe(res: Response): Promise<{ data?: unknown; error?: string }> {
  const text = await res.text();
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html") || text.startsWith("<!DOC")) {
    return { error: `Server returned ${res.status} HTML page` };
  }
  try {
    const json = JSON.parse(text);
    if (json.error) return { error: json.error.message };
    return { data: json.data ?? json };
  } catch {
    return { error: "Invalid response from server" };
  }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await parseJsonSafe(res)) as { data?: T; error?: string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function apiPatch<T>(url: string, body: unknown): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await parseJsonSafe(res)) as { data?: T; error?: string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function apiDelete(url: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(url, { method: "DELETE" });
    return (await parseJsonSafe(res)) as { error?: string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Request failed" };
  }
}
