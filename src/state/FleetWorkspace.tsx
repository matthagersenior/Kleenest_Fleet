import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { getCurrentDispatch, getFleetAccess, getFleetDashboard, getFleetIntelligence, getFleetProductAccess } from '@/services/fleet';

type Workspace = { business_id: string; business_name?: string | null; name?: string | null; role?: string | null; [key: string]: unknown };
type State = {
  workspace: Workspace | null;
  dashboard: Record<string, unknown> | null;
  dispatch: Record<string, unknown> | null;
  intelligence: Record<string, unknown> | null;
  entitlement: Record<string, unknown> | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const FleetWorkspaceContext = createContext<State | null>(null);

export function FleetWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [dispatch, setDispatch] = useState<Record<string, unknown> | null>(null);
  const [intelligence, setIntelligence] = useState<Record<string, unknown> | null>(null);
  const [entitlement, setEntitlement] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setError(null);
    const supabase = getSupabaseClient();
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!auth.session) throw new Error('Sign in to Kleenest Fleet to continue.');
    // Supabase only returns demo workspaces for verified platform-owner sessions.
    // Regular Fleet users continue to receive only their own Business memberships.
    const { data: rows, error: workspaceError } = await supabase.rpc('business_list_workspaces', { p_include_demo: true });
    if (workspaceError) throw workspaceError;
    const candidates = (Array.isArray(rows) ? rows : []) as Workspace[];
    let selected: Workspace | null = null;
    for (const candidate of candidates) {
      if (candidate.business_id && await getFleetAccess(candidate.business_id)) { selected = candidate; break; }
    }
    if (!selected) throw new Error('No Fleet-enabled Business workspace is available for this account.');
    const businessId = selected.business_id;
    const [nextDashboard, nextDispatch, nextIntelligence, nextEntitlement] = await Promise.all([
      getFleetDashboard(businessId),
      getCurrentDispatch(businessId),
      getFleetIntelligence(businessId),
      getFleetProductAccess(businessId),
    ]);
    setWorkspace(selected);
    setDashboard(nextDashboard);
    setDispatch(nextDispatch);
    setIntelligence(nextIntelligence as unknown as Record<string, unknown>);
    setEntitlement(nextEntitlement as unknown as Record<string, unknown>);
  }, []);

  useEffect(() => {
    setLoading(true);
    hydrate().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))).finally(() => setLoading(false));
  }, [hydrate]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await hydrate(); } finally { setRefreshing(false); }
  }, [hydrate]);

  const value = useMemo(() => ({ workspace, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh }), [workspace, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh]);
  return <FleetWorkspaceContext.Provider value={value}>{children}</FleetWorkspaceContext.Provider>;
}

export function useFleetWorkspace() {
  const value = useContext(FleetWorkspaceContext);
  if (!value) throw new Error('useFleetWorkspace must be used inside FleetWorkspaceProvider.');
  return value;
}
