"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Globe, Lock, Bug, Cloud, AlertTriangle, Zap, Check, Network, Search, X } from "lucide-react";
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
      description: "Tickets, TGT, ST, Golden Ticket",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "active-directory",
      label: "Active Directory",
      description: "SID, groupes, délégation, permissions",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "ldap-injection",
      label: "LDAP Injection",
      description: "Bypass auth, wildcard, exploitation",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "oauth",
      label: "OAuth",
      description: "Flux OAuth, redirect_uri, consent",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "jwt",
      label: "JWT",
      description: "Signing, alg none, claims, refresh token",
      icon: <Shield className="w-5 h-5" />,
    },
  ],
  "Systèmes d'exploitation": [
    {
      id: "windows-internals",
      label: "Windows Internals",
      description: "Tokens, services, UAC, process",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "linux",
      label: "Linux",
      description: "Syscalls, permissions, sudo, SUID",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "privilege-escalation",
      label: "Privilege Escalation",
      description: "Escalade, permissions, bypass",
      icon: <AlertTriangle className="w-5 h-5" />,
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
    {
      id: "gcp",
      label: "GCP",
      description: "IAM, metadata, services, roles",
      icon: <Cloud className="w-5 h-5" />,
    },
  ],
  "Conteneurs": [
    {
      id: "docker",
      label: "Docker",
      description: "Images, volumes, isolation, escape",
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "kubernetes",
      label: "Kubernetes",
      description: "Pods, RBAC, secrets, privilege",
      icon: <Cloud className="w-5 h-5" />,
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
  "Web": [
    {
      id: "web-client",
      label: "Web - Client",
      description: "HTML, JS, cookies, CSP, XSS",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      id: "web-server",
      label: "Web - Serveur",
      description: "HTTP, routing, auth, framework",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      id: "owasp",
      label: "OWASP",
      description: "Top 10, désérialisation, validation",
      icon: <Globe className="w-5 h-5" />,
    },
  ],
  "Attaques Web": [
    {
      id: "sql-injection",
      label: "SQL Injection",
      description: "Union, boolean, blind SQLi, exploitation",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "xxe",
      label: "XXE",
      description: "XML, external entity, DoS",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "ssrf",
      label: "SSRF",
      description: "Fetch interne, metadata, SSRF chain",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "csrf",
      label: "CSRF",
      description: "Cross-site request forgery, tokens",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Cryptographie": [
    {
      id: "cryptography",
      label: "Cryptographie",
      description: "Hash, RSA, ECC, modes",
      icon: <Lock className="w-5 h-5" />,
    },
    {
      id: "pki",
      label: "PKI",
      description: "Certificats, CAs, chain validation",
      icon: <Lock className="w-5 h-5" />,
    },
    {
      id: "tls",
      label: "TLS",
      description: "Handshake, certs, MITM",
      icon: <Lock className="w-5 h-5" />,
    },
  ],
  "Malware": [
    {
      id: "malware",
      label: "Malware",
      description: "Virus, worms, trojan, botnets",
      icon: <Bug className="w-5 h-5" />,
    },
    {
      id: "rootkits",
      label: "Rootkits",
      description: "Kernel, user-mode, persistence",
      icon: <Bug className="w-5 h-5" />,
    },
    {
      id: "ransomware",
      label: "Ransomware",
      description: "Encryption, lateral movement, extortion",
      icon: <Bug className="w-5 h-5" />,
    },
  ],
  "Reverse Engineering": [
    {
      id: "reverse-engineering",
      label: "Reverse Engineering",
      description: "Analyse binaire, PE, ELF, disassembly",
      icon: <Bug className="w-5 h-5" />,
    },
    {
      id: "yara",
      label: "YARA",
      description: "Règles, signatures, triage",
      icon: <Bug className="w-5 h-5" />,
    },
  ],
  "Analyse": [
    {
      id: "forensics",
      label: "Forensic",
      description: "Artefacts, mémoire, disque, timeline",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "siem",
      label: "SIEM",
      description: "Logs, alertes, SOC, correlation",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "logs",
      label: "Logs",
      description: "Windows, Linux, cloud, audit",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "sigma",
      label: "Sigma",
      description: "Règles SIEM, normalisation",
      icon: <Zap className="w-5 h-5" />,
    },
  ],
  "Exploitation": [
    {
      id: "rce",
      label: "RCE",
      description: "Remote Code Execution, commands, shells",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "buffer-overflow",
      label: "Buffer Overflow",
      description: "Stack, heap, exploit primitives",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: "race-conditions",
      label: "Race Conditions",
      description: "TOCTOU, temp race, exploitation",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ],
  "Frameworks": [
    {
      id: "mitre-attack",
      label: "MITRE ATT&CK",
      description: "Tactics, techniques, matrices",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "threat-hunting",
      label: "Threat Hunting",
      description: "Recherche proactive, hypothèses",
      icon: <Shield className="w-5 h-5" />,
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
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filtrer les catégories en fonction de la recherche
  const filteredGroups = Object.entries(CATEGORY_GROUPS).reduce((acc, [groupName, categories]) => {
    const filtered = categories.filter(
      (cat) =>
        cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[groupName] = filtered;
    }
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-cyber-surface/50 border border-cyber-border hover:border-white/30 focus:border-white text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

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
              <p className="text-sm text-gray-400">Mélange de questions</p>
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
      <AnimatePresence mode="wait">
        {Object.entries(filteredGroups).length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {Object.entries(filteredGroups).map((group, groupIdx) => (
              <motion.div
                key={group[0]}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.05 }}
              >
                <p className="px-2 mb-3 text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
                  {group[0]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group[1].map((category, catIdx) => (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (groupIdx * 3 + catIdx) * 0.02 }}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "rounded-xl border transition-all duration-300 p-4 text-left group relative overflow-hidden hover:scale-105 active:scale-95",
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
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">Aucune catégorie trouvée</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
