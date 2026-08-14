"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, Globe, Lock, Bug, Cloud, AlertTriangle, Zap, Check, Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const CATEGORY_GROUPS: Record<string, Category[]> = {
  "Authentification": [
    {
      id: "kerberos",
      label: "Kerberos",
      description: "Tickets Kerberos, TGT, ST, Golden Ticket",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "active-directory",
      label: "Active Directory",
      description: "SID, groupes, délégation, permissions",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "jwt",
      label: "JWT",
      description: "Signing, alg none, claims, refresh token",
      icon: <Shield className="w-5 h-5" />,
    },
  ],
  "Réseau": [
    {
      id: "reseau",
      label: "Réseau",
      description: "TCP/IP, OSI, protocoles, firewalls",
      icon: <Network className="w-5 h-5" />,
    },
  ],
  "Cloud": [
    {
      id: "cloud-aws",
      label: "Cloud AWS",
      description: "IAM, S3, EC2, SSRF cloud",
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "azure",
      label: "Azure",
      description: "VM, Key Vault, RBAC, NSG",
      icon: <Cloud className="w-5 h-5" />,
    },
  ],
  "Attaques Web": [
    {
      id: "sql-injection",
      label: "SQL Injection",
      description: "Union, boolean, blind SQLi, exploitation",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Malware": [
    {
      id: "malware",
      label: "Malware",
      description: "Virus, worms, trojan, botnets, rootkits",
      icon: <Bug className="w-5 h-5" />,
    },
  ],
};

export function CategorySelector({
  value,
  onChange,
  onClose,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onClose: () => void;
}) {
  const toggleCategory = (categoryId: string) => {
    if (categoryId === "global") {
      onChange(["global"]);
      return;
    }

    if (value.includes("global")) {
      onChange([categoryId]);
    } else if (value.includes(categoryId)) {
      onChange(value.filter((id) => id !== categoryId));
    } else {
      onChange([...value, categoryId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Option */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => {
          toggleCategory("global");
          onClose();
        }}
        className={cn(
          "w-full rounded-2xl border-2 transition-all duration-300 p-4 text-left group relative overflow-hidden",
          value.includes("global")
            ? "border-white bg-white/10 shadow-lg shadow-white/20"
            : "border-cyber-border hover:border-white/30 bg-cyber-surface/30 hover:bg-cyber-surface/50"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Toutes les catégories</p>
              <p className="text-sm text-gray-400">50 questions variées</p>
            </div>
          </div>
          {value.includes("global") && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
            >
              <Check className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* Category Groups */}
      {Object.entries(CATEGORY_GROUPS).map((group, groupIdx) => (
        <div key={group[0]}>
          <p className="px-2 mb-3 text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
            {group[0]}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group[1].map((category, catIdx) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (groupIdx * 3 + catIdx) * 0.03 }}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "rounded-xl border transition-all duration-300 p-4 text-left group relative overflow-hidden",
                  value.includes(category.id)
                    ? "border-white bg-white/10 shadow-lg shadow-white/20"
                    : "border-cyber-border hover:border-white/30 bg-cyber-surface/30 hover:bg-cyber-surface/50"
                )}
              >
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300",
                        value.includes(category.id)
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                      )}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{category.label}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <AnimatePresence>
                    {value.includes(category.id) && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: "spring", damping: 12 }}
                        className="flex-shrink-0"
                      >
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
