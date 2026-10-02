import { useMemo } from 'react';

// Mulberry32 PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function StarField({ className }: { className?: string }) {
  const stars = useMemo(() => {
    const random = mulberry32(12345);
    const layers = [
      { count: 120, r: 0.5, opacity: 0.4 }, // background
      { count: 40, r: 1.0, opacity: 0.6 },  // mid
      { count: 20, r: 1.5, opacity: 0.8 },  // foreground
    ];

    const generated = [];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const x = random() * 100;
        const y = random() * 100;
        const delay = random() * 5;
        const duration = 2 + random() * 3;
        const brightTwinkle = random() > 0.8;
        generated.push({ x, y, r: layer.r, baseOpacity: layer.opacity, delay, duration, brightTwinkle });
      }
    }
    return generated;
  }, []);

  return (
    <svg className={`star-field ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={`${star.x}%`}
          cy={`${star.y}%`}
          r={star.r}
          fill="white"
          style={{
            opacity: star.baseOpacity,
            animation: `twinkle${star.brightTwinkle ? '-bright' : ''} ${star.duration}s ease-in-out infinite ${star.delay}s alternate`,
          }}
        />
      ))}
    </svg>
  );
}
