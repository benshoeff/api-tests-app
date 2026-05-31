"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Environment {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  color: string;
  isDefault: boolean;
}

interface EnvironmentContextValue {
  environments: Environment[];
  activeEnvironment: Environment | null;
  setActiveEnvironmentId: (id: string) => void;
  refreshEnvironments: () => Promise<void>;
  loading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

const STORAGE_KEY = "api-tests-active-env";

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEnvironments = useCallback(async () => {
    const res = await fetch("/api/environments");
    const json = await res.json();
    if (json.data) {
      setEnvironments(json.data);
      const stored = localStorage.getItem(STORAGE_KEY);
      const defaultEnv = json.data.find((e: Environment) => e.isDefault) ?? json.data[0];
      if (stored && json.data.some((e: Environment) => e.id === stored)) {
        setActiveId(stored);
      } else if (defaultEnv) {
        setActiveId(defaultEnv.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshEnvironments();
  }, [refreshEnvironments]);

  const setActiveEnvironmentId = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeEnvironment = environments.find((e) => e.id === activeId) ?? null;

  return (
    <EnvironmentContext.Provider
      value={{
        environments,
        activeEnvironment,
        setActiveEnvironmentId,
        refreshEnvironments,
        loading,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}
