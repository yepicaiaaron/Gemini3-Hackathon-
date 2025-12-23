
import React, { useEffect, useState, useRef } from 'react';

interface FallingTextProps {
  topic: string;
  statusText?: string;
}

const CONCEPTS = [
  "Casting Narrative Arc", "Analyzing Data Points", "Visual Synthesis", "Tone Calibration", "Dramatic Tension",
  "Spatial Composition", "Audio Engineering", "Temporal Mapping", "Directorial Reasoning", "Style Consistency",
  "Researching Archives", "Cross-Referencing", "Agent Communication", "Heuristic Planning", "Visual Metaphors",
  "Deep Intel Gathering", "Scene Logic", "Motion Intent", "Narrative Cohesion", "Cinematic Quality"
];

interface Drop {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  scale: number;
}

export const FallingText: React.FC<FallingTextProps> = ({ topic, statusText }) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const initDrops = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      text: CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)],
      x: Math.random() * 100, // vw
      y: Math.random() * 100 - 100, // start above
      speed: 0.15 + Math.random() * 0.4,
      opacity: 0.1 + Math.random() * 0.3,
      scale: 0.7 + Math.random() * 0.4
    }));
    setDrops(initDrops);

    const animate = () => {
      setDrops(prevDrops => prevDrops.map(drop => {
        let newY = drop.y + drop.speed;
        let newOpacity = drop.opacity;
        
        if (newY > 110) {
          newY = -20;
          newOpacity = 0.1 + Math.random() * 0.3;
        }

        return { ...drop, y: newY, opacity: newOpacity };
      }));
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/90 to-black z-0" />
      {drops.map(drop => (
        <div
          key={drop.id}
          className="absolute transform -translate-x-1/2 font-mono font-bold whitespace-nowrap"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            opacity: drop.opacity,
            fontSize: `${drop.scale}rem`,
            color: '#3f3f46', // zinc-700
            textShadow: '0 0 5px rgba(0,0,0,0.8)'
          }}
        >
          {drop.text}
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center space-y-6 max-w-2xl px-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-widest">Active Neural Link</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter">Constructing Video...</h2>
              <div className="flex flex-col items-center gap-4">
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest border-b border-zinc-800 pb-2">Synthesizing Intel: {topic}</p>
                  {statusText && (
                      <p className="text-zinc-200 font-serif text-lg italic animate-in fade-in slide-in-from-bottom-2 duration-700">
                          "{statusText}"
                      </p>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
