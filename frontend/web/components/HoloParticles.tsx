import React, { useEffect, useRef } from "react";

const HoloParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 2 + 0.5,
      s: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(0,255,200,0.25)";
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
        p.y += p.s;
        if (p.y > c.height) p.y = -p.r;
      }
      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={800}
      className="absolute inset-0 pointer-events-none opacity-20"
    />
  );
};

export default HoloParticles;
