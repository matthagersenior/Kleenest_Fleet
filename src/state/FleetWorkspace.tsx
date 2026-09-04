import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getSupabaseClient } from '@/lib/supabase';
import { getCurrentDispatch, getFleetAccess, getFleetDashboard, getFleetIntelligence, getFleetProductAccess } from '@/services/fleet';

type Workspace = { business_id: string; business_name?: string | null; name?: string | null; role?: string | null; business_tier?: string | null; [key: string]: unknown };
type State = {
  workspace: Workspace | null;
  workspaces: Workspace[];
  dashboard: Record<string, unknown> | null;
  dispatch: Record<string, unknown> | null;
  intelligence: Record<string, unknown> | null;
  entitlement: Record<string, unknown> | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectWorkspace: (businessId: string) => Promise<void>;
};

const FleetWorkspaceContext = createContext<State | null>(null);
const WORKSPACE_KEY = 'kleenest.fleet.selected_workspace';

async function loadWorkspaceData(selected: Workspace) {
  const businessId = selected.business_id;
  const [dashboard, dispatch, intelligence, entitlement] = await Promise.all([
    getFleetDashboard(businessId),
    getCurrentDispatch(businessId),
    getFleetIntelligence(businessId),
    getFleetProductAccess(businessId),
  ]);
  return { dashboard, dispatch, intelligence: intelligence as unknown as Record<string, unknown>, entitlement: entitlement as unknown as Record<string, unknown> };
}

export function FleetWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [dispatch, setDispatch] = useState<Record<string, unknown> | null>(null);
  const [intelligence, setIntelligence] = useState<Record<string, unknown> | null>(null);
  const [entitlement, setEntitlement] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async (preferredBusinessId?: string) => {
    setError(null);
    const supabase = getSupabaseClient();
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError) throw new Error(authError.message);
    if (!auth.session) throw new Error('Sign in to Kleenest Fleet to continue.');
    const { data: rows, error: workspaceError } = await supabase.rpc('business_list_workspaces', { p_include_demo: true });
    if (workspaceError) throw new Error(workspaceError.message);
    const candidates = (Array.isArray(rows) ? rows : []) as Workspace[];
    const accessChecks = await Promise.all(candidates.map(async candidate => {
      try { return { candidate, allowed: Boolean(candidate.business_id) && await getFleetAccess(candidate.business_id) }; }
      catch { return { candidate, allowed: false }; }
    }));
    const eligible = accessChecks.filter(item => item.allowed).map(item => item.candidate);
    if (!eligible.length) {
      setWorkspaces([]);
      setWorkspace(null);
      throw new Error('No Fleet-enabled Business workspace is available for this account.');
    }
    const selected = eligible.find(candidate => candidate.business_id === preferredBusinessId) ?? eligible[0];
    const detail = await loadWorkspaceData(selected);
    setWorkspaces(eligible);
    setWorkspace(selected);
    setDashboard(detail.dashboard);
    setDispatch(detail.dispatch);
    setIntelligence(detail.intelligence);
    setEntitlement(detail.entitlement);
    await SecureStore.setItemAsync(WORKSPACE_KEY, selected.business_id).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const preferred = await SecureStore.getItemAsync(WORKSPACE_KEY).catch(() => null);
      await hydrate(preferred ?? undefined);
    })()
      .catch(cause => { if (mounted) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [hydrate]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await hydrate(workspace?.business_id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setRefreshing(false); }
  }, [hydrate, workspace?.business_id]);

  const selectWorkspace = useCallback(async (businessId: string) => {
    setRefreshing(true);
    try {
      await SecureStore.setItemAsync(WORKSPACE_KEY, businessId);
      await hydrate(businessId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setRefreshing(false); }
  }, [hydrate]);

  const value = useMemo(() => ({ workspace, workspaces, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh, selectWorkspace }), [workspace, workspaces, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh, selectWorkspace]);
  return <FleetWorkspaceContext.Provider value={value}>{children}</FleetWorkspaceContext.Provider>;
}

export function useFleetWorkspace() {
  const value = useContext(FleetWorkspaceContext);
  if (!value) throw new Error('useFleetWorkspace must be used inside FleetWorkspaceProvider.');
  return value;
}
