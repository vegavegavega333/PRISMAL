import React, { useEffect, useRef } from 'react';

export interface CursorRingFieldProps {
  className?: string;
  width?: number;
  height?: number;
  ringCount?: number;
  ringColor?: string;
  accentColor?: string;
  interactive?: boolean;
}

export const CursorRingField: React.FC<CursorRingFieldProps> = ({
  className = '',
  width = 300,
  height = 300,
  ringCount = 6,
  ringColor = 'rgba(148, 163, 184, 0.25)',
  accentColor = 'rgba(16, 185, 129, 0.45)',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: width / 2,
    y: height / 2,
    targetX: width / 2,
    targetY: height / 2,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = width / 2;
      mouseRef.current.targetY = height / 2;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      t += 0.015;
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = m.x;
      const cy = m.y;
      const maxRadius = Math.min(width, height) * 0.45;

      for (let i = 1; i <= ringCount; i++) {
        const factor = i / ringCount;
        const baseR = maxRadius * factor;
        const wave = Math.sin(t * 1.8 + i * 0.7) * 4;
        const r = Math.max(2, baseR + wave);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = i === ringCount ? 1.5 : 1;
        ctx.strokeStyle = i === ringCount ? accentColor : ringColor;
        ctx.stroke();

        // Little orbit particle along each ring
        const angle = t * (0.8 - factor * 0.4) + i;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = i === 1 ? accentColor : 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [width, height, ringCount, ringColor, accentColor, interactive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`pointer-events-auto ${className}`}
    />
  );
};

export default CursorRingField;
