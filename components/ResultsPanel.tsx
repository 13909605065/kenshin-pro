"use client";

import { TrainingModule as TrainingModuleType } from "@/lib/types";
import { TrainingModule } from "./TrainingModule";

interface Props {
  modules: TrainingModuleType[];
  activeModule?: string;
}

export function ResultsPanel({ modules, activeModule }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="w-1 h-6 bg-[#992828] rounded-full" />
        训练方案
      </h2>

      {modules.map((mod, i) => (
        <TrainingModule
          key={i}
          module={mod}
          defaultExpanded={activeModule === `module_${i + 1}`}
        />
      ))}
    </div>
  );
}
