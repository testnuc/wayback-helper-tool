import { useEffect, useState } from "react";

interface RippleProps {
  color?: string;
  count?: number;
}

export const Ripple = ({ color = "bg-primary/5", count = 3 }: RippleProps) => {
  const [ripples, setRipples] = useState<number[]>([]);

  useEffect(() => {
    setRipples(Array.from({ length: count }, (_, i) => i));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {ripples.map((i) => (
        <div
          key={i}
          className={`absolute ${color} rounded-full animate-ripple`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 1}s`,
            height: "20px",
            width: "20px",
          }}
        />
      ))}
    </div>
  );
};