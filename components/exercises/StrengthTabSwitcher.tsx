"use client";

type Tab = "library" | "free";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}
const TABS: { value: Tab; label: string }[] = [
  { value: "library", label: "动作库" },
  { value: "free", label: "自由训练" },
];

export function StrengthTabSwitcher({ active, onChange }: Props) {
  return (
    <div className="flex bg-[#1e1e1e] rounded-lg p-0.5">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            active === tab.value
              ? "bg-[#992828] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
