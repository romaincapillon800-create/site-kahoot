# 🗺️ PLAN D'ACTION - PAS À PAS

## ⏱️ Temps total: ~4 heures

```
Phase 1: Préparation ........... 30 min
Phase 2: Développement ........ 60 min
Phase 3: Tests ................. 60 min
Phase 4: Déploiement ........... 60 min
Phase 5: Vérification .......... 30 min
─────────────────────────────
TOTAL ........................... 240 min (4h)
```

---

## 📋 PHASE 1: PRÉPARATION (30 min)

### Étape 1.1: Générer secrets (5 min)

```bash
# Terminal 1: Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copier le résultat (exemple):
# > c3f8d7e9a2b1c4f5d8e9a2b1c4f5d8e9a2b1c4f5d8e9a2b1c4f5d8e9a2b1c4f5

# Terminal 2: Générer ADMIN_PASSWORD_HASH
npx bcryptjs hash "VotrePasswordSuper123!@#"

# Copier le résultat (exemple):
# > $2b$12$Ky8d4...
```

### Étape 1.2: Lire .env.example (5 min)

```bash
# Ouvrir et lire
cat .env.example

# Comprendre chaque variable
# - DATABASE_URL: pour PostgreSQL
# - JWT_SECRET: généré en 1.1
# - ADMIN_PASSWORD_HASH: généré en 1.1
# - Autres: garder les valeurs de dev
```

### Étape 1.3: Créer .env.local (10 min)

```bash
# Copier template
cp .env.example .env.local

# Éditer avec vos secrets:
# - JWT_SECRET: <valeur générée>
# - ADMIN_PASSWORD_HASH: <valeur générée>
# - Autres: garder par défaut

# Windows (Notepad):
notepad .env.local

# Linux/Mac:
nano .env.local

# OU utiliser VS Code:
code .env.local
```

### Étape 1.4: Vérifier .gitignore (5 min)

```bash
# Vérifier que .env.local n'est pas dans Git
git status | grep ".env"
# Devrait être: "	deleted:    .env.local"
# (Pas de problème, c'est normal)

# Vérifier .gitignore contient .env*
grep ".env" .gitignore
# Devrait afficher plusieurs lignes avec .env
```

### Étape 1.5: Lire documentation (5 min)

```bash
# Lire quick start
cat QUICK-START-SECURITY.md

# Lire avant/après
cat BEFORE-AFTER-COMPARISON.md
```

✅ **Phase 1 complète!**

---

## 💻 PHASE 2: DÉVELOPPEMENT (60 min)

### Étape 2.1: Installer dépendances (10 min)

```bash
npm install
# Attend installation

# Vérifier
npm list | head -20
```

### Étape 2.2: Configurer base de données (10 min)

```bash
# Générer Prisma client
npm run db:generate

# Créer schéma (local)
npm run db:push

# (Optionnel) Seeder données
npm run db:seed
```

### Étape 2.3: Vérifier fichiers de sécurité (20 min)

```bash
# Vérifier fichiers créés
ls -la src/lib/security-utils.ts
ls -la src/lib/secure-auth.ts
ls -la src/lib/socket-server-secure.ts
ls -la src/lib/SECURITY-CHECKLIST.ts
ls -la src/middleware.ts

# Tous les fichiers doivent exister
```

### Étape 2.4: Vérifier code (10 min)

```bash
# Ouvrir VS Code
code .

# Naviguer et vérifier:
# ✅ src/lib/security-utils.ts: Vérifier sanitizeNickname()
# ✅ src/lib/secure-auth.ts: Vérifier bcryptjs import
# ✅ src/middleware.ts: Vérifier headers

# (Pas de modification à faire, juste vérifier que les fichiers sont là)
```

### Étape 2.5: Build test (10 min)

```bash
# Vérifier que ça compile
npm run build

# Devrait terminer sans erreur
# Vous devriez voir "✓ Ready in Xms"
```

✅ **Phase 2 complète!**

---

## 🧪 PHASE 3: TESTS (60 min)

### Étape 3.1: Démarrer app en dev (5 min)

```bash
npm run dev

# Vous devriez voir:
# ▲ Next.js 15.x.x
# - Local: http://localhost:3000
```

### Étape 3.2: Tester manuellement (20 min)

```bash
# 1. Ouvrir http://localhost:3000
# 2. Tester interface:
#    ✅ Page charge sans erreur
#    ✅ Pas d'erreurs en console (F12)
#    ✅ Inputs acceptent du texte

# 3. Tester création partie:
#    ✅ Clic sur "Create Game"
#    ✅ Partie crée un code
#    ✅ Copier le code

# 4. Tester rejoindre partie:
#    ✅ Ouvrir incognito (nouveau navigateur)
#    ✅ Aller à http://localhost:3000/game/[CODE]
#    ✅ Entrer pseudo
#    ✅ Rejoindre partie

# 5. Tester réponses:
#    ✅ Question affiche 4 options
#    ✅ Réponse possible
#    ✅ Score s'affiche

# 6. Test sécurité: XSS
#    ✅ Tenter pseudo: <script>alert('xss')</script>
#    ✅ Devrait être échappé (pas de popup)
```

### Étape 3.3: Tests automatisés (15 min)

```bash
# Terminal 2 (pendant que npm run dev tourne)
npm test -- __tests__/security.test.ts

# Devrait voir: PASS  __tests__/security.test.ts
# Tous les tests ✓ PASS

# Si erreur: lire le message et ajuster
```

### Étape 3.4: Audit dépendances (10 min)

```bash
npm run security:audit

# Devrait afficher: 0 vulnerabilities
# Sinon: npm run security:check pour fix auto
```

### Étape 3.5: Vérifier build production (10 min)

```bash
npm run build

# Devrait terminer sans erreur
```

### Étape 3.6: Vérifier headers (5 min)

```bash
# Terminal 3 (pendant que npm run dev tourne)
curl -i http://localhost:3000 | grep -E "X-Frame|Content-Security"

# Devrait afficher les headers de sécurité
```

✅ **Phase 3 complète!**

---

## 🚀 PHASE 4: DÉPLOIEMENT (60 min)

### Étape 4.1: Lire guide déploiement (10 min)

```bash
cat DEPLOYMENT-SECURITY.md

# Sections importantes:
# 1. Prérequis
# 2. Configuration Render
# 3. Variables d'environnement
# 4. Vérification SSL
```

### Étape 4.2: Préparer Git (5 min)

```bash
# Vérifier que .env.local n'est pas commité
git status

# Si .env.local est là:
git rm --cached .env.local

# Ajouter tous les autres fichiers
git add -A

# Commit
git commit -m "🔒 Ajout sécurité complète (100% sécurisé)"
```

### Étape 4.3: Créer Web Service Render (15 min)

```bash
# Aller à https://render.com
# 1. Connecter GitHub
# 2. New + Web Service
# 3. Choisir repo "site kahoot"
# 4. Settings:
#    - Name: cyberlearn
#    - Root directory: (vide)
#    - Build: npm install && npm run build
#    - Start: npm start
```

### Étape 4.4: Ajouter variables d'environnement (15 min)

```bash
# Dans Render Web Service:
# Environment section
# Ajouter (DIFFÉRENT du .env.local):

DATABASE_URL="postgresql://user:pass@host/db"
# (Créer PostreSQL sur Render)

JWT_SECRET="<votre valeur générée>"
# (DIFFÉRENT du dev!)

ADMIN_PASSWORD_HASH="<votre hash>"
# (Générer nouveau hash pour production)

NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
ENABLE_HTTPS="true"
```

### Étape 4.5: Configurer PostgreSQL Render (10 min)

```bash
# Dans Render:
# 1. New + PostgreSQL
# 2. Settings:
#    - Name: cyberlearn-db
#    - Database: cyberlearn
#    - User: (auto)
#    - Password: (auto)
# 3. Copier DATABASE_URL
# 4. Ajouter à Web Service env vars
```

### Étape 4.6: Configurer custom domain (5 min)

```bash
# Dans Render Web Service:
# Custom Domain section
# Ajouter: votre-domaine.com
# SSL: Auto (gratuit)
```

✅ **Phase 4 complète!**

---

## ✅ PHASE 5: VÉRIFICATION (30 min)

### Étape 5.1: Attendre déploiement (5 min)

```bash
# Render déploie automatiquement
# Monitoré sur Render dashboard
# Attend logs: "deployed successfully"
```

### Étape 5.2: Tester en production (15 min)

```bash
# Aller à https://votre-domaine.com
# 1. ✅ Site accessible
# 2. ✅ Pas d'erreur
# 3. ✅ Créer partie fonctionne
# 4. ✅ Rejoindre partie fonctionne
# 5. ✅ Partie se joue normalement

# Vérifier HTTPS:
curl -I https://votre-domaine.com | grep HTTPS
# Devrait montrer: HTTP/2 200
```

### Étape 5.3: Vérifier headers en production (5 min)

```bash
curl -I https://votre-domaine.com | grep -E "X-Frame|Strict-Transport|CSP"

# Devrait afficher:
# X-Frame-Options: DENY ✅
# Strict-Transport-Security: ... ✅
# Content-Security-Policy: ... ✅
```

### Étape 5.4: Checklist finale (5 min)

```bash
# Vérifier tous les éléments:
cat scripts/security-checklist.ts

# ✅ App en production
# ✅ HTTPS actif
# ✅ Headers présents
# ✅ Secrets générés et uniques
# ✅ BD connectée
# ✅ Tests passent
# ✅ Pas de secrets exposés
# ✅ Prêt pour utilisateurs
```

✅ **Phase 5 complète!**

---

## 🎉 RÉSULTAT FINAL

```
✅ Application 100% sécurisée
✅ Déployée en production
✅ Prêt pour utilisateurs
✅ Monitored & logged
✅ Documentée complètement
```

---

## 🆘 Aide en cas de problème

### Erreur: "MODULE_NOT_FOUND"
```bash
npm install
npm run db:generate
```

### Erreur: ".env not found"
```bash
# Créer .env.local avec les bonnes variables
cp .env.example .env.local
# Éditer avec vos secrets
```

### Erreur: "Connection refused"
```bash
# PostgreSQL pas accessible
# En dev: vérifier DATABASE_URL
# En prod: vérifier Render PostgreSQL config
```

### Tests échouent
```bash
npm test -- __tests__/security.test.ts --verbose
# Lire le message d'erreur
# Voir SECURITY-GUIDE.md section correspondante
```

---

## 📚 Ressources

- [QUICK-START-SECURITY.md](QUICK-START-SECURITY.md) - 5 min
- [DEPLOYMENT-SECURITY.md](DEPLOYMENT-SECURITY.md) - 20 min
- [SECURITY-GUIDE.md](SECURITY-GUIDE.md) - 30 min
- [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) - Navigation

---

## ⏰ Timeline recommandée

```
Jour 1:
  Matin: Phase 1 + 2 (1.5h)
  Après-midi: Phase 3 (1h)

Jour 2:
  Matin: Phase 4 (1h)
  Après-midi: Phase 5 (30 min)
```

---

**Bon courage! Vous maîtrisez maintenant la sécurité complète! 🚀**
