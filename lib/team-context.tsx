"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  getTeams,
  getActiveTeamId,
  setActiveTeamId,
  addTeam,
  renameTeam,
  deleteTeam,
  initTeamSync,
  type Team,
} from "@/lib/team-storage";

interface TeamContextValue {
  teamId: string;
  teams: Team[];
  switchTeam: (id: string) => void;
  addNewTeam: (name: string) => Team;
  renameExistingTeam: (id: string, name: string) => void;
  deleteExistingTeam: (id: string) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teamId, setTeamId] = useState<string>("_loading_");
  const [teams, setTeams] = useState<Team[]>([]);

  const doSync = useCallback(() => {
    initTeamSync().then(() => {
      setTeamId(getActiveTeamId());
      setTeams(getTeams());
    });
  }, []);

  // Hydrate from localStorage on mount, then sync from Supabase.
  useEffect(() => {
    setTeamId(getActiveTeamId());
    setTeams(getTeams());
    doSync();
  }, [doSync]);

  // Re-sync when user switches back to this tab (cross-device updates)
  useEffect(() => {
    const onFocus = () => { doSync(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [doSync]);

  const switchTeam = useCallback((id: string) => {
    setActiveTeamId(id);
    setTeamId(id);
  }, []);

  const addNewTeam = useCallback((name: string) => {
    const team = addTeam(name);
    setTeams(getTeams());
    return team;
  }, []);

  const renameExistingTeam = useCallback((id: string, name: string) => {
    renameTeam(id, name);
    setTeams(getTeams());
  }, []);

  const deleteExistingTeam = useCallback((id: string) => {
    const currentTeams = getTeams();
    if (currentTeams.length <= 1) return; // Must keep at least one
    deleteTeam(id);
    const remaining = getTeams();
    setTeams(remaining);
    if (teamId === id) {
      const newId = remaining[0]?.id || getActiveTeamId();
      setActiveTeamId(newId);
      setTeamId(newId);
    }
  }, [teamId]);

  return (
    <TeamContext.Provider value={{ teamId, teams, switchTeam, addNewTeam, renameExistingTeam, deleteExistingTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
