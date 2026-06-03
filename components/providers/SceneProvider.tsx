"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Role, Scene } from "@/lib/scene-types";
import { getScenes, getDefaultScene, COACH_SCENES, ATHLETE_SCENES } from "@/lib/scene-types";

interface SceneCtx {
  role: Role;
  setRole: (r: Role) => void;
  scene: Scene;
  setScene: (s: Scene) => void;
  scenes: typeof COACH_SCENES | typeof ATHLETE_SCENES;
}

const SceneContext = createContext<SceneCtx>({
  role: "coach", setRole: () => {},
  scene: "planning", setScene: () => {},
  scenes: COACH_SCENES,
});

export function useScene() { return useContext(SceneContext); }

export function SceneProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("coach");
  const [scene, setSceneState] = useState<Scene>("planning");

  useEffect(() => {
    try {
      const r = localStorage.getItem("kenshin_role") as Role;
      if (r === "coach" || r === "athlete") {
        setRoleState(r);
        const s = localStorage.getItem("kenshin_scene");
        const valid = (r === "coach" ? COACH_SCENES : ATHLETE_SCENES).map(x => x.id);
        setSceneState(s && valid.includes(s as any) ? s as Scene : getDefaultScene(r));
      }
    } catch {}
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r); localStorage.setItem("kenshin_role", r);
    const d = getDefaultScene(r);
    setSceneState(d); localStorage.setItem("kenshin_scene", d);
  }, []);

  const setScene = useCallback((s: Scene) => {
    setSceneState(s); localStorage.setItem("kenshin_scene", s);
  }, []);

  return (
    <SceneContext.Provider value={{ role, setRole, scene, setScene, scenes: getScenes(role) }}>
      {children}
    </SceneContext.Provider>
  );
}
