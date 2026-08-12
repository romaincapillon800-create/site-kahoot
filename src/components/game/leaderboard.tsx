"use client";

import { motion } from "framer-motion";
import { cn, formatScore } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/game";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string | null;
  compact?: boolean;
}

const rankIcons = [Trophy, Medal, Award];

export function Leaderboard({
  entries,
  currentPlayerId,
  compact = false,
}: LeaderboardProps) {
  return (
    <ol className={cn("space-y-2", compact ? "max-h-64 overflow-y-auto" : "")}>
      {entries.map((entry, index) => {
        const RankIcon = rankIcons[index] || null;
        const isCurrent = entry.id === currentPlayerId;

        return (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all",
              isCurrent
                ? "bg-cyber-neon-purple/20 border border-cyber-neon-purple/40"
                : "bg-cyber-surface/50 border border-transparent",
              index === 0 && "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20"
            )}
          >
            <span
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm",
                index === 0
                  ? "bg-yellow-500/20 text-yellow-400"
                  : index === 1
                    ? "bg-gray-400/20 text-gray-300"
                    : index === 2
                      ? "bg-amber-700/20 text-amber-500"
                      : "bg-cyber-surface text-gray-500"
              )}
            >
              {RankIcon ? (
                <RankIcon className="w-4 h-4" aria-hidden="true" />
              ) : (
                entry.rank
              )}
            </span>
            <span
              className={cn(
                "flex-1 font-medium truncate",
                isCurrent && "text-white"
              )}
            >
              {entry.nickname}
            </span>
            <span className="font-mono font-bold text-white">
              {formatScore(entry.score)}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
