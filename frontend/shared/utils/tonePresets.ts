// utils/tonePresets.ts
export const tonePresets = [
  {
    id: "emerald",
    name: "Emerald Calm",
    desc: "Soft teal holographic glow",
    style: {
      "--tone-primary": "0,255,200",
      "--tone-accent": "0,150,255",
      "--tone-shadow": "0,255,150",
    },
  },
  {
    id: "violet",
    name: "Violet Storm",
    desc: "Purple-blue glow with high contrast",
    style: {
      "--tone-primary": "150,80,255",
      "--tone-accent": "80,0,200",
      "--tone-shadow": "180,100,255",
    },
  },
  {
    id: "amber",
    name: "Amber Flux",
    desc: "Golden warm shimmer",
    style: {
      "--tone-primary": "255,200,50",
      "--tone-accent": "255,140,0",
      "--tone-shadow": "255,220,100",
    },
  },
];
