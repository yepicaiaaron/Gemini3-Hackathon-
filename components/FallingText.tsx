import React, { useEffect, useState, useRef } from 'react';

interface FallingTextProps {
  topic: string;
}

const CONCEPTS = [
  "Visual Metaphor", "Color Theory", "Pacing", "Narrative Arc", "Emotional Hook",
  "Dynamic Lighting", "Composition", "Sound Design", "Motion Graphics", "Typography",
  "Cinematography", "Texture", "Depth of Field", "Contrast", "Rhythm",
  "Storytelling", "Audience Engagement", "Data Visualization", "Abstract Imagery", "Realism"
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

export const FallingText: React.FC<FallingTextProps> = ({ topic }) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const initDrops = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      text: CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)],
      x: Math.random() * 100, // vw
      y: Math.random() * 100 - 100, // start above
      speed: 0.2 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.5,
      scale: 0.8 + Math.random() * 0.5
    }));
    setDrops(initDrops);

    const animate = () => {
      setDrops(prevDrops => prevDrops.map(drop => {
        let newY = drop.y + drop.speed;
        let newOpacity = drop.opacity;
        
        if (newY > 110) {
          newY = -20;
          newOpacity = 0.1 + Math.random() * 0.5;
        }

        return { ...drop, y: newY, opacity: newOpacity };
      }));
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/80 to-black z-0" />
      {drops.map(drop => (
        <div
          key={drop.id}
          className="absolute transform -translate-x-1/2 transition-all duration-300 ease-out cursor-default pointer-events-auto hover:text-blue-400 hover:scale-150 hover:opacity-100 hover:z-50 hover:shadow-[0_0_15px_rgba(59,130,246,0.8)]"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            opacity: drop.opacity,
            fontSize: `${drop.scale}rem`,
            color: '#52525b', // zinc-600
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 'bold',
            textShadow: '0 0 5px rgba(0,0,0,0.5)'
          }}
        >
          {drop.text}
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-white animate-pulse tracking-tight">Constructing Narrative...</h2>
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Synthesizing "{topic}"</p>
          </div>
      </div>
    </div>
  );
};
