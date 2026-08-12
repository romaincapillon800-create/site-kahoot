"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Play, Settings2, Shield, Users, X } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaderboard } from "@/components/game/leaderboard";
import { useGameStore } from "@/store/game-store";
import type { GameSettings } from "@/types/game";
import {
  adminLogin,
  createGame,
  hostJoinGame,
  hostNextQuestion,
  hostStartGame,
  hostUpdateSettings,
  hostEndGame,
  hostKickPlayer,
  useSocket,
} from "@/lib/socket-client";

const defaultSettings = {
  questionCount: 10,
  questionTime: 20,
};

export default function AdminPage() {
  const router = useRouter();
  useSocket();

  const isHost = useGameStore((state) => state.isHost);
  const adminLoggedIn = useGameStore((state) => state.adminLoggedIn);
  const phase = useGameStore((state) => state.phase);
  const code = useGameStore((state) => state.code);
  const players = useGameStore((state) => state.players);
  const settings = useGameStore((state) => state.settings);
  const countdown = useGameStore((state) => state.countdown);
  const question = useGameStore((state) => state.question);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const reveal = useGameStore((state) => state.reveal);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const error = useGameStore((state) => state.error);

  const [tab, setTab] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localQCount, setLocalQCount] = useState(settings.questionCount);
  const [localQTime, setLocalQTime] = useState(settings.questionTime);
  const [selectedCategory, setSelectedCategory] = useState<string>("global");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [leaderboardCountdown, setLeaderboardCountdown] = useState<number | null>(null);
  const [playerSearchFilter, setPlayerSearchFilter] = useState("");

  useEffect(() => {
    setLocalQCount(settings.questionCount);
    setLocalQTime(settings.questionTime);
  }, [settings.questionCount, settings.questionTime]);

  useEffect(() => {
    if (phase !== "reveal") {
      setLeaderboardCountdown(null);
      return;
    }

    setLeaderboardCountdown(5);
    const intervalId = window.setInterval(() => {
      setLeaderboardCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) return 0;
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [phase, reveal?.correctOptionId]);

  useEffect(() => {
    if (!isHost) {
      setActionError(null);
    }
  }, [isHost]);

  const connectedPlayers = players.filter((player) => player.isConnected);
  const hasPlayers = connectedPlayers.length > 0;

  const filteredPlayers = connectedPlayers.filter((player) =>
    player.nickname.toLowerCase().includes(playerSearchFilter.toLowerCase())
  );

  const normalizeSettings = (questionCount: number, questionTime: number): GameSettings => ({
    questionCount: Math.min(100, Math.max(5, Number.isFinite(questionCount) ? questionCount : 10)),
    questionTime: Math.min(60, Math.max(10, Number.isFinite(questionTime) ? questionTime : 20)),
  });

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setLoading(true);

    const result = await adminLogin(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setActionError(result.message || "Identifiants invalides.");
      return;
    }

    setActionError(null);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setLoading(true);

    const nextSettings: GameSettings = {
      ...normalizeSettings(localQCount, localQTime),
      category: selectedCategory,
    };
    setLocalQCount(nextSettings.questionCount);
    setLocalQTime(nextSettings.questionTime);

    const result = await createGame(nextSettings);

    setLoading(false);

    if (!result.success) {
      setActionError(result.error || "Impossible de créer la partie.");
      return;
    }

    setActionError(null);
  };

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setLoading(true);

    const result = await hostJoinGame(joinCode);
    setLoading(false);

    if (!result.success) {
      setActionError(result.error || "Impossible de rejoindre la partie.");
      return;
    }

    setActionError(null);
  };

  const handleSettingsSave = () => {
    const nextSettings = normalizeSettings(localQCount, localQTime);
    setLocalQCount(nextSettings.questionCount);
    setLocalQTime(nextSettings.questionTime);

    hostUpdateSettings(nextSettings);
  };

  const lobbyActions = useMemo(() => {
    if (phase === "lobby") {
      return (
        <div className="space-y-4">
          <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">Code de la partie</p>
                <p className="mt-2 text-4xl font-semibold tracking-[0.4em] text-white">
                  {code || "------"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Joueurs</p>
                <p className="mt-1 text-3xl font-bold">{connectedPlayers.length}</p>
              </div>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => hostStartGame()}
              disabled={connectedPlayers.length === 0}
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Lancer la partie
            </Button>
          </div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6 text-center">
          <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">Départ</p>
          <p className="mt-4 text-6xl font-bold text-white">{countdown ?? 0}s</p>
          <p className="mt-3 text-gray-400">La partie commence bientôt.</p>
        </div>
      );
    }

    if (phase === "question") {
      return (
        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6">
          <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">Question en cours</p>
          <p className="mt-4 text-2xl font-semibold">{question?.text || "Chargement..."}</p>
          <p className="mt-3 text-sm text-gray-400">Temps restant : {timeRemaining}s</p>
          <Button 
            className="mt-6 w-full" 
            variant="danger" 
            onClick={() => hostEndGame()}
          >
            Terminer la partie
          </Button>
        </div>
      );
    }

    if (phase === "reveal") {
      return (
        <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6">
          <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">Révélation</p>
          <p className="mt-4 text-xl font-semibold">Réponse correcte</p>
          <p className="mt-2 text-2xl text-white">{reveal?.correctOptionText || "-"}</p>
          <p className="mt-3 text-gray-400">{reveal?.explanation || "Aucune explication disponible."}</p>

          <div className="mt-6 rounded-2xl border border-cyber-border bg-cyber-surface/80 p-4 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Classement</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {leaderboardCountdown !== null && leaderboardCountdown > 0
                ? `Le classement s'affiche dans ${leaderboardCountdown}s`
                : "Le classement s'affiche maintenant"}
            </p>
          </div>

          <Button 
            className="mt-6 w-full" 
            variant="danger" 
            onClick={() => hostEndGame()}
          >
            Terminer la partie
          </Button>
        </div>
      );
    }

    if (phase === "leaderboard") {
      return (
        <div className="space-y-5">
          <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6 text-center">
            <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">État de la partie</p>
            <p className="mt-4 text-4xl font-semibold">Classement</p>
          </div>

          <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6">
            <p className="text-2xl font-bold">Classement</p>
            <p className="mt-2 text-sm text-gray-400">Retrouvez le classement des joueurs et préparez la prochaine étape.</p>
            <div className="mt-5">
              <Leaderboard entries={leaderboard} compact />
            </div>
            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={() => hostNextQuestion()}>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                Question suivante
              </Button>
              <Button className="w-full" variant="danger" onClick={() => hostEndGame()}>
                Terminer la partie
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (phase === "finished") {
      return (
        <div className="space-y-5">
          <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6 text-center">
            <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">État de la partie</p>
            <p className="mt-4 text-4xl font-semibold">Partie terminée</p>
          </div>

          <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6">
            <p className="text-2xl font-bold">Classement final</p>
            <p className="mt-2 text-sm text-gray-400">Retrouvez le classement final et les résultats de la partie.</p>
            <div className="mt-5">
              <Leaderboard entries={leaderboard} compact />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-cyber-border bg-cyber-surface/70 p-6 text-center">
        <p className="text-sm uppercase text-gray-400 tracking-[0.2em]">État de la partie</p>
        <p className="mt-4 text-xl font-semibold">{phase === "leaderboard" ? "Classement" : "Partie terminée"}</p>
      </div>
    );
  }, [countdown, hasPlayers, leaderboard, phase, question?.text, reveal?.correctOptionId, reveal?.explanation, timeRemaining]);

  return (
    <>
      <AnimatedBackground />
      <main className="relative min-h-screen py-8">
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6">
          <header className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Espace Hôte</p>
              <h1 className="text-4xl font-bold tracking-tight">
                Gérer votre partie <span className="neon-text">CyberLearn</span>
              </h1>
              <p className="max-w-2xl text-gray-400">
                Créez, rejoignez et pilotez votre session en direct. Affichez les joueurs, lancez le quiz et faites progresser les questions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => router.push("/")}>Retour</Button>
              <Button variant="ghost" size="sm" onClick={() => setTab(tab === "create" ? "join" : "create")}>Basculer</Button>
            </div>
          </header>

          {!adminLoggedIn ? (
            <>
              <div className="mx-auto max-w-xl text-center">
                <h1 className="text-4xl font-bold tracking-tight">
                  Cyber<span className="neon-text">Learn</span>
                </h1>
                <p className="mt-3 text-gray-400">
                  Créez une session en direct. Affichez les joueurs, lancez le quiz et gérez la partie en temps réel.
                </p>
              </div>

              <Card className="p-0 overflow-hidden max-w-xl mx-auto">
                <CardHeader>
                  <CardTitle>Connexion administrateur</CardTitle>
                  <CardDescription>Seuls les comptes admin peuvent créer ou piloter une partie.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    <div>
                      <Label htmlFor="admin-email">Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-password">Mot de passe</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    {actionError && <p className="text-sm text-red-400">{actionError}</p>}
                    <Button type="submit" disabled={loading || !email.trim() || !password.trim()}>
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : !isHost ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                {tab === "create" && (
                  <Card className="p-0 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Créer une nouvelle partie</CardTitle>
                      <CardDescription>Choisissez le nombre de questions et le temps par question.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <form onSubmit={handleCreate} className="space-y-5">
                      <div>
                        <Label htmlFor="create-question-count">Nombre de questions</Label>
                        <Input
                          id="create-question-count"
                          type="number"
                          min={5}
                          max={100}
                          value={localQCount}
                          onChange={(event) => setLocalQCount(Number(event.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-question-time">Temps par question</Label>
                        <Input
                          id="create-question-time"
                          type="number"
                          min={10}
                          max={60}
                          value={localQTime}
                          onChange={(event) => setLocalQTime(Number(event.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-category">Catégorie</Label>
                        <select
                          id="create-category"
                          value={selectedCategory}
                          onChange={(event) => setSelectedCategory(event.target.value)}
                          className="w-full rounded-xl border border-cyber-border bg-cyber-surface/80 px-4 py-3 text-white transition-all duration-300 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                        >
                          <option value="global">Global (toutes les catégories)</option>
                          <option value="reseau-infra">Réseau & Infrastructure</option>
                          <option value="web-apis">Web & APIs</option>
                          <option value="crypto">Cryptographie</option>
                          <option value="malware-re">Malware & Reverse Engineering</option>
                          <option value="incident-response">Incident Response</option>
                          <option value="attaques">Attaques</option>
                          <option value="securite-donnees">Sécurité des données</option>
                        </select>
                      </div>
                      {actionError && <p className="text-sm text-red-400">{actionError}</p>}
                      <Button type="submit" disabled={loading}>
                        {loading ? "Création..." : "Créer la partie"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                )}

                {tab === "join" && (
                  <Card className="p-0 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Rejoindre une partie existante</CardTitle>
                      <CardDescription>Utilisez un code de partie pour prendre la main.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleJoin} className="space-y-5">
                        <div>
                          <Label htmlFor="host-code">Code de la partie</Label>
                          <Input
                            id="host-code"
                            type="text"
                            maxLength={6}
                            value={joinCode}
                            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                            placeholder="Ex: A8KD9P"
                          />
                        </div>
                        {actionError && <p className="text-sm text-red-400">{actionError}</p>}
                        <Button type="submit" disabled={loading || !joinCode.trim()}>
                          {loading ? "Connexion..." : "Rejoindre la partie"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                {error && <p className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
                <Card className="p-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle>Tableau de bord hôte</CardTitle>
                    <CardDescription>Code : {code}</CardDescription>
                  </CardHeader>
                  <CardContent>{lobbyActions}</CardContent>
                </Card>

              </div>

              <Card className="p-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                <CardHeader>
                  <CardTitle>Joueurs connectés</CardTitle>
                  <CardDescription>Voir les pseudos, scores et présence.</CardDescription>
                </CardHeader>
                <CardContent>
                  {connectedPlayers.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucun joueur pour l’instant.</p>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        type="text"
                        placeholder="Rechercher un joueur..."
                        value={playerSearchFilter}
                        onChange={(e) => setPlayerSearchFilter(e.target.value)}
                        className="rounded-2xl border border-cyber-border bg-cyber-surface/80 px-4 py-2 text-sm text-white placeholder-gray-500 transition-all duration-300 focus:border-white/50 focus:bg-cyber-surface focus:shadow-lg focus:shadow-white/20"
                      />
                      <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {filteredPlayers.length === 0 ? (
                          <li className="text-sm text-gray-400 text-center py-4">Aucun joueur ne correspond à votre recherche.</li>
                        ) : (
                          filteredPlayers.map((player) => (
                            <li key={player.id} className="rounded-2xl border border-cyber-border p-4 bg-cyber-surface/80 transition-all duration-300 hover:bg-cyber-surface hover:border-white/50 hover:shadow-lg hover:shadow-white/10">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="truncate text-sm font-semibold">{player.nickname}</p>
                                  <p className="text-xs text-gray-500">{player.score} pts</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white">
                                    {player.isConnected ? "✓" : "✗"}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => hostKickPlayer(player.id)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                                  >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
