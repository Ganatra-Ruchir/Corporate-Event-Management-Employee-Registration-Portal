"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { configured, supabase } from "@/lib/supabase";
import type { Membership, Organization, Profile, Role } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  org: Organization | null;
  role: Role | null;
  loading: boolean;
  configured: boolean;
  chooseOrg: (id: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(configured);

  const load = useCallback(async (current: User | null) => {
    if (!supabase || !current) {
      setProfile(null); setMemberships([]); setLoading(false); return;
    }
    const [p, m] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name").eq("id", current.id).maybeSingle(),
      supabase.from("memberships").select("organization_id,user_id,role,organization:organizations(id,name,description,created_at)").eq("user_id", current.id)
    ]);
    if (p.error) console.error("Profile lookup failed", p.error.message);
    if (m.error) console.error("Membership lookup failed", m.error.message);
    setProfile((p.data as Profile | null) ?? null);
    setMemberships(((m.data || []) as unknown as Membership[]).map(x => ({
      ...x, organization: Array.isArray(x.organization) ? x.organization[0] ?? null : x.organization
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let mounted = true;
    client.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      void load(data.user);
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);
      // Delay Supabase queries until the auth change callback releases the auth lock.
      setTimeout(() => { if (mounted) void load(session?.user || null); }, 0);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [load]);

  const chooseOrg = (id: string) => setSelected(id);
  const activeMembership = memberships.find(x => x.organization_id === selected)
    ?? memberships.find(x => x.organization)
    ?? null;
  const org = activeMembership?.organization ?? null;
  const role = activeMembership?.role ?? null;
  const refresh = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    await load(data.user);
  };
  const signOut = async () => {
    await supabase?.auth.signOut();
    setUser(null); setProfile(null); setMemberships([]); setSelected("");
  };
  return <AuthContext.Provider value={{
    user, profile, memberships, org, role, loading, configured,
    chooseOrg, refresh, signOut
  }}>{children}</AuthContext.Provider>;
}