"use client";

import { motion } from "framer-motion";
import { Shield, Globe, Lock, Bug, Cloud, AlertTriangle, Zap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
      description: "Tickets, attaques Kerberos, Silver Ticket",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "active-directory",
      label: "Active Directory",
      description: "LDAP, SPN, Kerberoasting, DCSync",
      icon: <Shield className="w-4 h-4" />,
    },
  ],
  "Systèmes d'exploitation": [
    {
      id: "windows",
      label: "Windows Internals",
      description: "Tokens, privilèges, PEB, syscalls",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "linux",
      label: "Linux Internals",
      description: "Syscalls, x86_64, permissions, rootkits",
      icon: <Zap className="w-4 h-4" />,
    },
  ],
  "Cloud": [
    {
      id: "aws",
      label: "AWS",
      description: "IAM, S3, EC2, sécurité cloud",
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      id: "azure",
      label: "Azure",
      description: "Services cloud Microsoft, authentification",
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      id: "gcp",
      label: "GCP",
      description: "Google Cloud Platform, services",
      icon: <Cloud className="w-4 h-4" />,
    },
  ],
  "Conteneurs": [
    {
      id: "docker",
      label: "Docker",
      description: "Containérisation, images, sécurité",
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      id: "kubernetes",
      label: "Kubernetes",
      description: "Orchestration, RBAC, policy",
      icon: <Cloud className="w-4 h-4" />,
    },
  ],
  "Web": [
    {
      id: "oauth",
      label: "OAuth",
      description: "Authentification OAuth 2.0, flows",
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: "jwt",
      label: "JWT",
      description: "Tokens JWT, signature, claims",
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: "owasp",
      label: "OWASP",
      description: "Top 10, vulnérabilités Web",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
  ],
  "Attaques Web": [
    {
      id: "sql-injection",
      label: "SQL Injection",
      description: "Injection SQL, bypass, extraction",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "xxe",
      label: "XXE",
      description: "Injection XML, XXE, XXE blind",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "ssrf",
      label: "SSRF",
      description: "Server-Side Request Forgery",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "csrf",
      label: "CSRF",
      description: "Cross-Site Request Forgery, protection",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "ldap-injection",
      label: "LDAP Injection",
      description: "Injection LDAP, auth bypass",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
  ],
  "Cryptographie": [
    {
      id: "crypto",
      label: "Cryptographie",
      description: "Algorithmes, chiffrement, primes",
      icon: <Lock className="w-4 h-4" />,
    },
    {
      id: "pki",
      label: "PKI",
      description: "Certificats, CA, chaîne de confiance",
      icon: <Lock className="w-4 h-4" />,
    },
    {
      id: "tls",
      label: "TLS",
      description: "Protocole TLS, handshake, vulnérabilités",
      icon: <Lock className="w-4 h-4" />,
    },
  ],
  "Malware": [
    {
      id: "malwares",
      label: "Malwares",
      description: "Analyse, comportement, détection",
      icon: <Bug className="w-4 h-4" />,
    },
    {
      id: "rootkits",
      label: "Rootkits",
      description: "Noyau, persistence, stealth",
      icon: <Bug className="w-4 h-4" />,
    },
  ],
  "Reverse Engineering": [
    {
      id: "reverse-engineering",
      label: "Reverse Engineering",
      description: "Décompilation, assembleur, binaires",
      icon: <Bug className="w-4 h-4" />,
    },
    {
      id: "yara",
      label: "YARA",
      description: "Règles YARA, détection malware",
      icon: <Bug className="w-4 h-4" />,
    },
  ],
  "Détection": [
    {
      id: "sigma",
      label: "Sigma",
      description: "Règles Sigma, détection, logs",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "forensics",
      label: "Forensics",
      description: "Artefacts, logs, bash_history",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "siem",
      label: "SIEM",
      description: "Logs, événements, corrélation",
      icon: <Zap className="w-4 h-4" />,
    },
  ],
  "Exploitation": [
    {
      id: "rce",
      label: "RCE",
      description: "Execution de code à distance",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "buffer-overflow",
      label: "Buffer Overflow",
      description: "Débordement mémoire, stack, heap",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "privilege-escalation",
      label: "Privilege Escalation",
      description: "Escalade de privilèges, UAC",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "race-conditions",
      label: "Race Conditions",
      description: "Concurrence, timing attacks",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
  ],
  "Frameworks": [
    {
      id: "mitre-attack",
      label: "MITRE ATT&CK",
      description: "Tactiques, techniques, procedures",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "threat-hunting",
      label: "Threat Hunting",
      description: "Chasse aux menaces, détection",
      icon: <Shield className="w-4 h-4" />,
    },
  ],
};

export function CategorySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.keys(CATEGORY_GROUPS).reduce((acc, group) => ({ ...acc, [group]: false }), {})
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const getSelectedCategoryLabel = () => {
    if (value === "global") return "Toutes les catégories";
    
    for (const group of Object.values(CATEGORY_GROUPS)) {
      const found = group.find((cat) => cat.id === value);
      if (found) return found.label;
    }
    return "Sélectionner une catégorie";
  };

  return (
    <div className="space-y-3">
      {/* Selected Category Display */}
      <div className="rounded-lg border border-cyber-border bg-cyber-surface/50 px-3 py-2 min-h-10 flex items-center">
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Sélection:</span> <span className="font-semibold">{getSelectedCategoryLabel()}</span>
        </p>
      </div>

      {/* Global Option */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onChange("global")}
        className={cn(
          "w-full rounded-lg border transition-all duration-300 p-2 text-left text-sm",
          value === "global"
            ? "border-white bg-white/10"
            : "border-cyber-border hover:border-white/30 bg-cyber-surface/30"
        )}
      >
        <p className="font-semibold text-white">Toutes les catégories (50 questions)</p>
      </motion.button>

      {/* Category Groups - Collapsible */}
      <div className="space-y-2">
        {Object.entries(CATEGORY_GROUPS).map((group, groupIdx) => (
          <div key={group[0]}>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: groupIdx * 0.02 }}
              onClick={() => toggleGroup(group[0])}
              className="w-full flex items-center justify-between rounded-lg border border-cyber-border hover:border-white/30 bg-cyber-surface/30 px-3 py-2 transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.1em] text-gray-400 font-semibold">
                {group[0]}
              </p>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-300",
                  expandedGroups[group[0]] && "rotate-180"
                )}
              />
            </motion.button>

            {/* Category Items - Collapsible Content */}
            {expandedGroups[group[0]] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 mt-1 space-y-1 overflow-hidden"
              >
                {group[1].map((category) => (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onChange(category.id)}
                    className={cn(
                      "w-full rounded-lg border transition-all duration-300 p-2 text-left group",
                      value === category.id
                        ? "border-white bg-white/10 shadow-md"
                        : "border-cyber-border hover:border-white/30 bg-cyber-surface/30 hover:bg-cyber-surface/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all duration-300 mt-0.5",
                          value === category.id
                            ? "bg-white/20 text-white"
                            : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                        )}
                      >
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-xs">{category.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
