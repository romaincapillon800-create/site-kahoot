"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Shield, Trophy } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaderboard } from "@/components/game/leaderboard";
import { useGameStore } from "@/store/game-store";
import { submitAnswer, useSocket } from "@/lib/socket-client";

const CATEGORY_MAP: Record<string, string> = {
  // Short names for badges
  "kerberos": "Kerberos",
  "active-directory": "AD",
  "ldap-injection": "LDAP",
  "oauth": "OAuth",
  "jwt": "JWT",
  "windows-internals": "Windows",
  "linux": "Linux",
  "privilege-escalation": "Priv Esc",
  "cloud-aws": "AWS",
  "azure": "Azure",
  "gcp": "GCP",
  "docker": "Docker",
  "kubernetes": "K8s",
  "reseau": "Réseau",
  "web-client": "Web-C",
  "web-server": "Web-S",
  "owasp": "OWASP",
  "sql-injection": "SQL Inj",
  "xxe": "XXE",
  "ssrf": "SSRF",
  "csrf": "CSRF",
  "cryptography": "Crypto",
  "pki": "PKI",
  "tls": "TLS",
  "malware": "Malware",
  "rootkits": "Rootkits",
  "ransomware": "Ransomware",
  "reverse-engineering": "RE",
  "yara": "YARA",
  "forensics": "Forensics",
  "siem": "SIEM",
  "logs": "Logs",
  "sigma": "Sigma",
  "rce": "RCE",
  "buffer-overflow": "BOF",
  "race-conditions": "Race",
  "mitre-attack": "MITRE",
  "threat-hunting": "TH",
  "realiste": "Réaliste",
};

export default function GameRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = typeof params?.code === "string" ? params.code.toUpperCase() : "";

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  useSocket();

  const playerId = useGameStore((state) => state.playerId);
  const phase = useGameStore((state) => state.phase);
  const code = useGameStore((state) => state.code);
  const players = useGameStore((state) => state.players);
  const question = useGameStore((state) => state.question);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const reveal = useGameStore((state) => state.reveal);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const statistics = useGameStore((state) => state.statistics);
  const error = useGameStore((state) => state.error);

  const connectedPlayers = useMemo(
    () => players.filter((player) => player.isConnected),
    [players]
  );

  const currentPlayer = useMemo(
    () => players.find((player) => player.id === playerId),
    [players, playerId]
  );

  useEffect(() => {
    if (!playerId && roomCode) {
      return;
    }
  }, [playerId, roomCode]);

  useEffect(() => {
    if (phase === "question") {
      setHasAnswered(false);
      setSelectedOption(null);
    }
  }, [question?.id, phase]);

  const playerResult = useMemo(
    () => reveal?.playerResults.find((result) => result.playerId === playerId) ?? null,
    [reveal, playerId]
  );

  const playerRank = useMemo(
    () => leaderboard.find((entry) => entry.id === playerId)?.rank,
    [leaderboard, playerId]
  );

  const handleOptionSelect = (optionId: string) => {
    if (!question || hasAnswered) return;
    submitAnswer(question.id, optionId);
    setSelectedOption(optionId);
    setHasAnswered(true);
  };

  const showJoinHint = !playerId;

  return (
    <>
      <AnimatedBackground />
      <main className="relative min-h-screen py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Code de la partie</p>
              <h1 className="text-4xl font-bold tracking-tight text-white">{roomCode}</h1>
              <p className="mt-3 text-gray-400">Rejoignez la partie avec un pseudo depuis la page d’accueil.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push("/")}>Retour à l’accueil</Button>
          </div>

          {error && (
            <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          {showJoinHint ? (
            <Card>
              <CardHeader>
                <CardTitle>Rejoignez une partie depuis l’accueil</CardTitle>
                <CardDescription>Ce lien est réservé aux participants déjà connectés.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Retournez sur la page principale, saisissez votre code et votre pseudo, puis rejoignez la partie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <Card className="transition-all duration-300\">
                  <CardHeader>
                    <CardTitle>
                      {phase === "lobby" && "En attente de l’hôte"}
                      {phase === "countdown" && "Préparation"}
                      {phase === "question" && "Question"}
                      {phase === "reveal" && "Réponse"}
                      {phase === "leaderboard" && "Classement"}
                      {phase === "finished" && "Partie terminée"}
                    </CardTitle>
                    <CardDescription>
                      {phase === "lobby" && "Attendez que l’hôte lance le quiz."}
                      {phase === "countdown" && `Démarrage dans ${timeRemaining}s`}
                      {phase === "question" && `Temps restant : ${timeRemaining}s`}
                      {phase === "reveal" && "Découvrez la bonne réponse."}
                      {phase === "leaderboard" && "Classement après la question."}
                      {phase === "finished" && "Résultats finaux."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {phase === "lobby" && (
                      <div className="space-y-4">
                        <p className="text-gray-400">
                          {connectedPlayers.length} joueur{s(connectedPlayers.length)} dans la salle.
                        </p>
                        <ul className="space-y-2">
                          {connectedPlayers.map((player) => (
                            <li key={player.id} className="flex items-center justify-between rounded-2xl border border-cyber-border p-4 bg-cyber-surface/80 transition-all duration-300 hover:bg-cyber-surface hover:border-white/30">
                              <span className="transition-colors duration-300">{player.nickname}</span>
                              <span className="text-xs uppercase tracking-[0.25em] text-gray-500">
                                {player.isConnected ? "Connecté" : "Hors ligne"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {phase === "countdown" && (
                      <div className="rounded-3xl border border-white/20 bg-cyber-surface/80 p-8 text-center">
                        <p className="text-6xl font-bold text-white">{timeRemaining}s</p>
                        <p className="mt-3 text-gray-400">Préparez-vous.</p>
                      </div>
                    )}

                    {phase === "question" && question && (
                      <div className="space-y-6">
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Question {question.order}/{question.totalQuestions}</p>
                              <h2 className="mt-4 text-2xl font-semibold">{question.text}</h2>
                            </div>
                            <span className="ml-4 inline-flex items-center rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300 border border-blue-500/30 whitespace-nowrap">
                              {CATEGORY_MAP[question.category] || question.category}
                            </span>
                          </div>
                        </div>
                        <div className="grid gap-4">
                          {question.options.map((option) => {
                            const selected = selectedOption === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleOptionSelect(option.id)}
                                disabled={hasAnswered}
                                className={`w-full rounded-3xl border p-5 text-left transition-all duration-300 ${
                                  selected
                                    ? "border-white bg-white/25"
                                    : "border-cyber-border bg-cyber-surface/80 hover:border-white/50"
                                }`}
                              >
                                <span className="font-semibold">{option.text}</span>
                                {selected && <span className="mt-2 block text-sm text-white">Réponse enregistrée</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {phase === "reveal" && reveal && (
                      <div className="space-y-6">
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-6 transition-all duration-300\">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Bonne réponse</p>
                              <p className="mt-3 text-2xl font-semibold text-white">{reveal.correctOptionText}</p>
                            </div>
                            {question && (
                              <span className="ml-4 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                {CATEGORY_MAP[question.category] || question.category}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-gray-400">{reveal.explanation}</p>
                        </div>
                        <div className="grid gap-4 rounded-3xl border border-cyber-border bg-cyber-surface/80 p-6">
                          <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Votre résultat</p>
                          {playerResult ? (
                            <div className="flex items-center gap-3 text-lg">
                              <CheckCircle2 className={`w-6 h-6 ${playerResult.isCorrect ? "text-emerald-400" : "text-red-400"}`} />
                              <span>
                                {playerResult.isCorrect ? "Bonne réponse" : "Réponse incorrecte"} • +{playerResult.pointsEarned} pts
                              </span>
                            </div>
                          ) : (
                            <p className="text-gray-400">Aucune réponse enregistrée.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {phase === "leaderboard" && (
                      <div>
                        <Leaderboard entries={leaderboard} compact />
                      </div>
                    )}

                    {phase === "finished" && (
                      <div className="space-y-6">
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-6">
                          <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Statistiques de la partie</p>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-cyber-surface/90 p-4">
                              <p className="text-sm text-gray-400">Joueurs</p>
                              <p className="mt-2 text-xl font-semibold">{connectedPlayers.length}</p>
                            </div>
                            <div className="rounded-2xl bg-cyber-surface/90 p-4">
                              <p className="text-sm text-gray-400">Score max</p>
                              <p className="mt-2 text-xl font-semibold">{statistics?.highestScore ?? "-"}</p>
                            </div>
                          </div>
                        </div>
                        <Leaderboard entries={leaderboard} compact />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Votre profil</CardTitle>
                    <CardDescription>Suivez votre score et votre progression.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Pseudo</p>
                        <p className="mt-2 text-xl font-semibold">{currentPlayer?.nickname || "-"}</p>
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-5 transition-all duration-300 hover:bg-cyber-surface hover:border-white/20">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Score</p>
                          <p className="mt-2 text-xl font-semibold">{currentPlayer?.score ?? 0}</p>
                        </div>
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-5 transition-all duration-300 hover:bg-cyber-surface hover:border-white/20">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Classement</p>
                          <p className="mt-2 text-xl font-semibold">{playerRank ? `#${playerRank}` : "-"}</p>
                        </div>
                        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/80 p-5 transition-all duration-300 hover:bg-cyber-surface hover:border-white/20">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Connectés</p>
                          <p className="mt-2 text-xl font-semibold">{connectedPlayers.length}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function s(count: number) {
  return count > 1 ? "s" : "";
}
