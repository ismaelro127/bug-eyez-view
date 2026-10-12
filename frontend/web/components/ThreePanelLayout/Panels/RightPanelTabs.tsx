// components/ThreePanelLayout/Panels/RightPanelTabs.tsx
import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (v: string) => void;
}

export default function RightPanelTabs({ activeTab, setActiveTab }: Props) {
  const tabs = [
    "Info",
    "EPG",
    "AI Summary",
    "People",
    "Links",
    "Settings",
    "Profile",
  ];

  return (
    <div className="flex flex-row flex-wrap gap-2 mb-3 p-2 holo-tabs">
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
