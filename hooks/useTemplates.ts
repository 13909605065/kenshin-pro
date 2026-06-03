"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/supabase-client";
import { TrainingModule, PlayerFormData } from "@/lib/types";

export interface TrainingTemplate {
  id: string;
  user_id?: string;
  name: string;
  form_data: PlayerFormData;
  plan_content: TrainingModule[];
  created_at: string;
}

const LOCAL_KEY = "kenshin_templates";

export function useTemplates() {
  const [templates, setTemplates] = useState<TrainingTemplate[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const supabase = createClient();

  // Load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("training_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data?.length) {
        const mapped = data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          form_data: r.form_data,
          plan_content: r.plan_content,
          created_at: r.created_at,
        }));
        setTemplates(mapped);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped));
      }
    };
    load();
  }, []);

  const saveTemplate = useCallback(
    async (name: string, formData: PlayerFormData, modules: TrainingModule[]) => {
      const template: TrainingTemplate = {
        id: Date.now().toString(),
        name,
        form_data: { ...formData },
        plan_content: [...modules],
        created_at: new Date().toISOString(),
      };

      const updated = [template, ...templates].slice(0, 50);
      setTemplates(updated);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("training_templates").insert({
          id: template.id,
          user_id: user.id,
          name: template.name,
          form_data: template.form_data,
          plan_content: template.plan_content,
        });
      }

      return template;
    },
    [templates, supabase]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      await supabase.from("training_templates").delete().eq("id", id);
    },
    [templates, supabase]
  );

  return { templates, saveTemplate, deleteTemplate };
}
