"use client";

import { motion } from "framer-motion";

interface CircularTimerProps {
  timeRemaining: number;
  maxTime: number;
  size?: number;
}

export function CircularTimer({
  timeRemaining,
  maxTime,
  size = 80,
}: CircularTimerProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / maxTime;
  const strokeDashoffset = circumference * (1 - progress);

  const color =
    timeRemaining <= 5
      ? "#ef4444"
      : timeRemaining <= 10
        ? "#f59e0b"
        : "#00d4ff";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${timeRemaining} secondes restantes`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.3, ease: "linear" }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <span
        className="absolute text-xl font-bold font-mono"
        style={{ color }}
      >
        {timeRemaining}
      </span>
    </div>
  );
}
