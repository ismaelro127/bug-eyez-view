import React from "react";

interface LayoutHUDProps {
  open: boolean;
  values: Record<string, number>;
  setValue: (k: string, v: number) => void;
}

const LayoutHUD: React.FC<LayoutHUDProps> = ({ open, values, setValue }) => {
  if (!open) return null;

  const sliders = [
    ["Left Tilt", "leftRotate", -45, 45],
    ["Right Tilt", "rightRotate", -45, 45],
    ["Center Depth (video)", "centerDepth", -120, 60, 2],
    ["Edge Depth (panels)", "edgeDepth", 0, 160, 2],
    ["Perspective", "perspective", 400, 2000, 50],
    ["Left Width %", "leftWidth", 12, 40],
    ["Center Width %", "centerWidth", 36, 70],
    ["Right Width %", "rightWidth", 12, 40],
  ];

  return (
    <div className="absolute top-12 right-4 z-50 w-80 rounded-lg bg-black/70 border border-white/10 backdrop-blur-md p-3 space-y-3">
      <div className="text-sm font-semibold opacity-90">3D Layout Controls</div>
      {sliders.map(([label, key, min, max, step]) => {
  const k = String(key);
  return (
    <div key={k}>
      <div className="text-xs opacity-75">
        {label}: {values[k]}
        {k.includes("Rotate") ? "°" : k.includes("Depth") ? "px" : "%"}
      </div>
      <input
        type="range"
        min={min as number}
        max={max as number}
        step={step ?? 1}
        value={values[k]}
        onChange={(e) => setValue(k, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
})}

    </div>
  );
};

export default LayoutHUD;
