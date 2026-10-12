// components/LeftPanelTabs.tsx
import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (v: string) => void;
}

export default function LeftPanelTabs({ activeTab, setActiveTab }: Props) {
  const tabs = ["All", "Categories", "Languages", "Regions", "Favorites"];

  return (
    <div className="flex flex-row gap-2 mb-3 p-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setActiveTab(t)}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition
            ${activeTab === t ? "holo-tab-active" : "holo-tab"}
          `}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
