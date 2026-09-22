import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Dashboard, type GroupSummary } from "../lib/api";
import { useAuth } from "./AuthContext";

type AppDataValue = {
  dashboard: Dashboard | null;
  groups: GroupSummary[] | null;
  reloadDashboard: () => Promise<void>;
  reloadGroups: () => Promise<void>;
  setDashboard: (update: (current: Dashboard) => Dashboard) => void;
};

const AppDataContext = createContext<AppDataValue | null>(null);

/**
 * The dashboard and the group list are read by both the pages and the sidebar, so
 * they're fetched once here and shared. The nav adds no requests of its own.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dashboard, setDashboardState] = useState<Dashboard | null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);

  const reloadDashboard = useCallback(async () => {
    setDashboardState(await api.dashboard(90));
  }, []);

  const reloadGroups = useCallback(async () => {
    setGroups(await api.groups());
  }, []);

  const setDashboard = useCallback((update: (current: Dashboard) => Dashboard) => {
    setDashboardState((current) => (current ? update(current) : current));
  }, []);

  useEffect(() => {
    if (!user) {
      setDashboardState(null);
      setGroups(null);
      return;
    }
    void reloadDashboard().catch(() => setDashboardState(null));
    void reloadGroups().catch(() => setGroups([]));
  }, [user, reloadDashboard, reloadGroups]);

  return (
    <AppDataContext.Provider
      value={{ dashboard, groups, reloadDashboard, reloadGroups, setDashboard }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
