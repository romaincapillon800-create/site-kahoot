"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Zap, Users, Lock, Trophy } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { joinGame, useSocket } from "@/lib/socket-client";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useSocket();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await joinGame(code.trim(), nickname.trim());
      if (result.success) {
        router.push(`/game/${code.trim().toUpperCase()}`);
      } else {
        setError(result.error || "Impossible de rejoindre la partie.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />

      <main className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-gradient flex items-center justify-center shadow-neon">
              <BookOpen className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Cyber<span className="neon-text">Learn</span>
            </span>
          </div>
          <nav aria-label="Navigation principale">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/admin")}
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Espace Hôte
            </Button>
          </nav>
        </header>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 max-w-3xl"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
              Apprentissage{" "}
              <span className="neon-text">Cybersécurité</span>
              <br />
              Multijoueur
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto text-balance">
              50 questions expert. Temps réel. Classement dynamique.
              Entrez un code et jouez instantanément.
            </p>
          </motion.div>

          {/* Join Card */}
          <motion.article
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="neon-border shadow-neon-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Rejoindre une partie</CardTitle>
                <CardDescription>
                  Entrez le code fourni par l&apos;hôte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoin} className="space-y-5">
                  <div>
                    <Label htmlFor="game-code">Code de la partie</Label>
                    <Input
                      id="game-code"
                      type="text"
                      placeholder="Ex: A8KD9P"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-[0.3em] uppercase"
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nickname">Pseudo</Label>
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="Votre pseudo"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={20}
                      required
                      autoComplete="off"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full text-base uppercase tracking-wider"
                    size="lg"
                    disabled={loading || !code.trim() || !nickname.trim()}
                  >
                    {loading ? "Connexion..." : "Rejoindre la partie"}
                  </Button>

                  <p className="text-center text-xs text-gray-500">
                    Pas besoin de créer un compte. Entrez simplement un code et un pseudo.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.article>

          {/* Features */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full"
            aria-label="Fonctionnalités"
          >
            {[
              { icon: Zap, title: "Temps réel", desc: "Socket.IO ultra-rapide" },
              { icon: Trophy, title: "Expert", desc: "50 questions difficiles" },
              { icon: Users, title: "Multijoueur", desc: "Jusqu'à 100 joueurs" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="glass-card p-5 text-center hover:border-white/30 transition-colors"
              >
                <Icon
                  className="w-6 h-6 mx-auto mb-3 text-white"
                  aria-hidden="true"
                />
                <h2 className="font-semibold mb-1">{title}</h2>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </motion.section>
        </section>

        <footer className="text-center py-6 text-xs text-gray-600">
          CyberLearn — Plateforme de quiz cybersécurité premium
        </footer>
      </main>
    </>
  );
}
