import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateGameCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function detectDevice(): "pc" | "mobile" {
  if (typeof window === "undefined") {
    return "pc";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Détection basée sur les patterns connus des appareils mobiles
  const mobilePatterns = [
    /android/,
    /webos/,
    /iphone/,
    /ipad/,
    /ipod/,
    /blackberry/,
    /windows phone/,
    /opera mini/,
    /iemobile/,
  ];

  const isMobileUA = mobilePatterns.some((pattern) => pattern.test(userAgent));
  
  // Vérification supplémentaire : media query pour les appareils tactiles
  const hasTouch = typeof window !== "undefined" && (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );

  // Vérification du viewport : si très petit, probablement mobile
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;

  return (isMobileUA || (hasTouch && isMobileViewport)) ? "mobile" : "pc";
}


export function formatScore(score: number): string {
  return score.toLocaleString("fr-FR");
}

export function calculatePoints(
  isCorrect: boolean,
  timeRemaining: number,
  maxTime: number,
  streak: number
): { points: number; bonus: string | null } {
  if (!isCorrect) {
    return { points: 0, bonus: null };
  }

  const basePoints = 1000;
  const timeBonus = Math.round((timeRemaining / maxTime) * 500);
  let multiplier = 1;
  let bonus: string | null = null;

  if (streak >= 5) {
    multiplier = 3;
    bonus = "Perfect Streak x3";
  } else if (streak >= 3) {
    multiplier = 2;
    bonus = "Streak x2";
  } else if (streak >= 2) {
    bonus = "Streak Bonus";
  }

  const points = Math.round((basePoints + timeBonus) * multiplier);
  return { points, bonus };
}

export function exportResultsToCSV(
  players: Array<{
    nickname: string;
    score: number;
    correctCount: number;
    maxStreak: number;
  }>
): string {
  const header = "Pseudo,Score,Bonnes réponses,Série max";
  const rows = players
    .sort((a, b) => b.score - a.score)
    .map(
      (p) =>
        `"${p.nickname}",${p.score},${p.correctCount},${p.maxStreak}`
    );
  return [header, ...rows].join("\n");
}
