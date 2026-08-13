"use client";

import { motion } from "framer-motion";
import { Shield, Globe, Lock, Bug, Cloud, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  count?: number;
}

const CATEGORY_GROUPS: Record<string, Category[]> = {
  "Authentification": [
    {
      id: "kerberos",
      label: "Kerberos",
      description: "Tickets, attaques Kerberos, Silver Ticket",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "active-directory",
      label: "Active Directory",
      description: "LDAP, SPN, Kerberoasting, DCSync",
      icon: <Shield className="w-5 h-5" />,
    },
  ],
  "Systèmes d'exploitation": [
    {
      id: "windows",
      label: "Windows Internals",
      description: "Tokens, privilèges, PEB, syscalls",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "linux",
      label: "Linux Internals",
      description: "Syscalls, x86_64, permissions, rootkits",
      icon: <Zap className="w-5 h-5" />,
    },
  ],
  "Cloud": [
    {
      id: "aws",
      label: "AWS",
      description: "IAM, S3, EC2, sécurité cloud",
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "azure",
      label: "Azure",
      description: "Services cloud Microsoft, authentification",
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "gcp",
      label: "GCP",
      description: "Google Cloud Platform, services",
      icon: <Cloud className="w-5 h-5" />,
    },
  ],
  "Conteneurs": [
    {
      id: "docker",
      label: "Docker",
      description: "Containérisation, images, sécurité",
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "kubernetes",
      label: "Kubernetes",
      description: "Orchestration, RBAC, policy",
      icon: <Cloud className="w-5 h-5" />,
    },
  ],
  "Web": [
    {
      id: "oauth",
      label: "OAuth",
      description: "Authentification OAuth 2.0, flows",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      id: "jwt",
      label: "JWT",
      description: "Tokens JWT, signature, claims",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      id: "owasp",
      label: "OWASP",
      description: "Top 10, vulnérabilités Web",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Attaques Web": [
    {
      id: "sql-injection",
      label: "SQL Injection",
      description: "Injection SQL, bypass, extraction",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "xxe",
      label: "XXE",
      description: "Injection XML, XXE, XXE blind",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "ssrf",
      label: "SSRF",
      description: "Server-Side Request Forgery",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "csrf",
      label: "CSRF",
      description: "Cross-Site Request Forgery, protection",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "ldap-injection",
      label: "LDAP Injection",
      description: "Injection LDAP, auth bypass",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Cryptographie": [
    {
      id: "crypto",
      label: "Cryptographie",
      description: "Algorithmes, chiffrement, primes",
      icon: <Lock className="w-5 h-5" />,
    },
    {
      id: "pki",
      label: "PKI",
      description: "Certificats, CA, chaîne de confiance",
      icon: <Lock className="w-5 h-5" />,
    },
    {
      id: "tls",
      label: "TLS",
      description: "Protocole TLS, handshake, vulnérabilités",
      icon: <Lock className="w-5 h-5" />,
    },
  ],
  "Malware": [
    {
      id: "malwares",
      label: "Malwares",
      description: "Analyse, comportement, détection",
      icon: <Bug className="w-5 h-5" />,
    },
    {
      id: "rootkits",
      label: "Rootkits",
      description: "Noyau, persistence, stealth",
      icon: <Bug className="w-5 h-5" />,
    },
  ],
  "Reverse Engineering": [
    {
      id: "reverse-engineering",
      label: "Reverse Engineering",
      description: "Décompilation, assembleur, binaires",
      icon: <Bug className="w-5 h-5" />,
    },
    {
      id: "yara",
      label: "YARA",
      description: "Règles YARA, détection malware",
      icon: <Bug className="w-5 h-5" />,
    },
  ],
  "Détection": [
    {
      id: "sigma",
      label: "Sigma",
      description: "Règles Sigma, détection, logs",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "forensics",
      label: "Forensics",
      description: "Artefacts, logs, bash_history",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "siem",
      label: "SIEM",
      description: "Logs, événements, corrélation",
      icon: <Zap className="w-5 h-5" />,
    },
  ],
  "Exploitation": [
    {
      id: "rce",
      label: "RCE",
      description: "Execution de code à distance",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "buffer-overflow",
      label: "Buffer Overflow",
      description: "Débordement mémoire, stack, heap",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "privilege-escalation",
      label: "Privilege Escalation",
      description: "Escalade de privilèges, UAC",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "race-conditions",
      label: "Race Conditions",
      description: "Concurrence, timing attacks",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Frameworks": [
    {
      id: "mitre-attack",
      label: "MITRE ATT&CK",
      description: "Tactiques, techniques, procedures",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "threat-hunting",
      label: "Threat Hunting",
      description: "Chasse aux menaces, détection",
      icon: <Shield className="w-5 h-5" />,
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
  return (
    <div className="space-y-6">
      {/* Global Option */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onChange("global")}
        className={cn(
          "w-full rounded-2xl border-2 transition-all duration-300 p-4 text-left",
          value === "global"
            ? "border-white bg-white/10 shadow-lg shadow-white/20"
            : "border-cyber-border hover:border-white/30 bg-cyber-surface/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Toutes les catégories</p>
            <p className="text-sm text-gray-400">50 questions variées</p>
          </div>
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
                transition={{ delay: (groupIdx * 3 + catIdx) * 0.05 }}
                onClick={() => onChange(category.id)}
                className={cn(
                  "rounded-xl border transition-all duration-300 p-4 text-left group",
                  value === category.id
                    ? "border-white bg-white/10 shadow-lg shadow-white/20"
                    : "border-cyber-border hover:border-white/30 bg-cyber-surface/30 hover:bg-cyber-surface/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300",
                      value === category.id
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
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
