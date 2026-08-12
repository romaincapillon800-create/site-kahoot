# 🚀 DÉPLOIEMENT SÉCURISÉ SUR RENDER

## ✅ Checklist pré-déploiement

### 1. Vérification des secrets

```bash
# ❌ Ces commandes ne doivent rien trouver
git log --all -S "password" --oneline
git log --all -S "admin123" --oneline  
git log --all -S "secret" --oneline
git ls-files --cached | grep "\.env"
git ls-files --cached | grep "secrets.json"
```

**Si vous trouvez quelque chose:**
```bash
# Nettoyer l'historique Git
git filter-branch --tree-filter 'rm -f .env secrets.json' -- --all
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Révoquer les anciens secrets!
```

### 2. Générer les secrets de production

```bash
# 1. JWT_SECRET (32+ hex chars)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 2. ADMIN_PASSWORD_HASH
npm install -g bcryptjs
bcryptjs hash "VotreMotDePasseSuper123!@#$%^&*()"
# Copier le résultat

# 3. DATABASE_URL
# Votre URL PostgreSQL depuis le provider (Render génère cela)
```

### 3. Vérifier .gitignore

```bash
cat .gitignore
# Doit contenir:
# .env
# .env.local
# .env.production
# .env.*.local
# secrets.json
# *.backup
```

### 4. Vérifier package.json

```bash
# Vérifier les dépendances de sécurité
npm audit

# Corriger les vulnérabilités
npm audit fix
```

### 5. Build local de test

```bash
npm run build

# Doit compiler sans erreur et sans warnings critiques
```

---

## 🔧 Configuration sur Render

### Étape 1: Créer un Web Service

1. Aller sur [render.com](https://render.com)
2. New → Web Service
3. Connecter GitHub (autoriser Render)
4. Sélectionner votre repo `site-kahoot`
5. Configuration:
   - **Name:** cyberlearn-server
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build && npm run db:push`
   - **Start Command:** `npm start`
   - **Instance Type:** Standard (au moins)

### Étape 2: Ajouter les variables d'environnement

Dashboard → Environment:

```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=<valeur générée>
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD_HASH=<hash bcryptjs>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
ENABLE_HTTPS=true
CORS_ALLOWED_ORIGINS=https://votre-domaine.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SOCKET_RATE_LIMIT_WINDOW_MS=1000
SOCKET_RATE_LIMIT_MAX_EVENTS=10
```

**❌ IMPORTANT: NE PAS utiliser les valeurs par défaut du `.env.example`**

### Étape 3: Configurer le domaine

1. Dashboard → Custom Domain
2. Ajouter votre domaine
3. Pointer DNS vers Render (instructions fournies)
4. Render génère automatiquement SSL certificate

### Étape 4: Configurer la base de données

**Option 1: PostgreSQL sur Render (Recommandé)**
1. Dashboard Render → New → PostgreSQL
2. Nom: `cyberlearn-db`
3. Région: Même que le web service
4. Copier la connection string dans `DATABASE_URL`

**Option 2: PostgreSQL externe (Neon, Railway, etc.)**
1. Copier la connection string
2. Ajouter dans `DATABASE_URL`

### Étape 5: Deploy initial

```bash
# Push sur GitHub
git add .
git commit -m "🔒 Security implementation"
git push origin main

# Render déploie automatiquement
# Vérifier les logs dans le dashboard
```

---

## 🔍 Vérifications post-déploiement

### 1. Vérifier que le site est accessible

```bash
curl https://votre-domaine.com
# Doit retourner 200 OK
```

### 2. Vérifier les headers de sécurité

```bash
curl -i https://votre-domaine.com | grep -i "x-frame\|x-content\|csp\|hsts"

# Résultat attendu:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
# Strict-Transport-Security: ...
```

### 3. Vérifier HTTPS forcé

```bash
curl -i http://votre-domaine.com
# Doit rediriger vers https (301/302)
```

### 4. Vérifier CORS

```bash
curl -H "Origin: https://malicious.com" -i https://votre-domaine.com/api/socket
# Ne doit PAS contenir: Access-Control-Allow-Origin

curl -H "Origin: https://votre-domaine.com" -i https://votre-domaine.com/api/socket
# Doit contenir: Access-Control-Allow-Origin: https://votre-domaine.com
```

### 5. Vérifier les logs

Dashboard → Logs:
```
Chercher:
✅ "CyberLearn ready on https://..."
✅ Pas d'erreurs critiques
❌ Pas de secrets exposés
❌ Pas d'erreurs de base de données
```

### 6. Tester login admin

1. Ouvrir https://votre-domaine.com/admin
2. Entrer credentials admin
3. Vérifier que c'est OK
4. Vérifier le token JWT dans DevTools

### 7. Tester une partie normale

1. Créer une partie (admin)
2. Rejoindre comme joueur
3. Vérifier que le pseudo est bien sanitisé
4. Soumettre une réponse
5. Vérifier que le score est correct

### 8. Test de rate limiting

```bash
# Lancer 100 requêtes rapidement
for i in {1..100}; do
  curl https://votre-domaine.com &
done
wait

# Certaines doivent être rate-limitées (429)
```

---

## 🛡️ Configuration additionnelle de sécurité

### 1. Activer les backups automatiques

Dashboard → Backups:
- Fréquence: Quotidien
- Rétention: 7 jours

### 2. Monitoring

#### Sentry (Error tracking)
```bash
npm install @sentry/node
```

```typescript
// server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### DataDog (Performance)
```bash
npm install dd-trace
```

```typescript
// server.ts
require("dd-trace").init({
  env: process.env.NODE_ENV,
  service: "cyberlearn",
});
```

### 3. WAF (Web Application Firewall)

Si disponible sur votre hébergeur:
- Activer les protections OWASP
- Rate limiting HTTP
- Anti-DDoS

### 4. CDN (Cloudflare recommandé)

1. Configurer Cloudflare gratuit
2. Mode SSL: "Full (strict)"
3. Activer les règles:
   - Bot management
   - Rate limiting rules
   - Web Application Firewall (WAF)

---

## 📊 Monitoring permanent

### Logs à surveiller

```typescript
// Erreurs
[ERROR] ...

// Tentatives de sécurité
[SECURITY] auth_attempt failed
[SECURITY] unauthorized_access
[SECURITY] score_manipulation

// Admin actions
[AUTH] Admin login: email
[AUTH] Admin created game
```

### Alertes à configurer

1. **Erreurs fréquentes** → Email
2. **Tentatives échouées** (> 10/h) → Email  
3. **Score manipulation** → Email + SMS
4. **Admin actions** → Dashboard
5. **Rate limit hits** → Dashboard

---

## 🔄 Mise à jour de sécurité

### Hebdomadaire

```bash
npm audit
npm audit fix
git push
```

### Mensuellement

- Vérifier les dépendances majeure
- Revoir les logs de sécurité
- Vérifier les certificats SSL
- Tester les backups

### Semestriellement

- Rotation des secrets (JWT_SECRET, etc.)
- Audit de sécurité complet
- Revue des permissions
- Teste de disaster recovery

---

## 🚨 En cas d'incident

### Découverte d'une faille de sécurité

1. **Immédiatement:**
   - Passer le service en maintenance
   - Créer une branche `fix/security-breach`

2. **Identifier la faille:**
   - Consulter les logs
   - Reproduire le problème
   - Quantifier l'impact

3. **Corriger:**
   - Implémenter le patch
   - Tester en local
   - Déployer sur staging d'abord

4. **Déployer la correction:**
   - Push vers main
   - Render déploie automatiquement
   - Vérifier les logs

5. **Post-incident:**
   - Audit complet du code
   - Notifier les utilisateurs si nécessaire
   - Renforcer la détection

### Secrets exposés

```bash
# 1. Révoquer immédiatement
# - Changer JWT_SECRET
# - Changer ADMIN_PASSWORD
# - Invalider les sessions

# 2. Vérifier l'historique
git log --all -S "exposed_secret"

# 3. Si sur GitHub:
# - Force push pour nettoyer
# - MAIS: les secrets sont déjà compromis!
# - Changer les secrets de toute façon

# 4. Audit:
# - Vérifier les logs d'accès
# - Voir si quelqu'un a utilisé le secret
# - Implémenter du monitoring

# 5. Prévention:
# - Pre-commit hooks
# - GitHub secret scanning
# - Audit réguliers
```

---

## ✅ Checklist finale avant le go-live

- [ ] Tous les secrets générés et uniques
- [ ] `.env` pas dans le repo
- [ ] Database sécurisée avec backups
- [ ] HTTPS configuré automatiquement
- [ ] Headers de sécurité vérifiés
- [ ] CORS limité au domaine
- [ ] Rate limiting actif
- [ ] Admin password hashe
- [ ] JWT secret fort
- [ ] Logs configurés
- [ ] Monitoring en place
- [ ] Alertes configurées
- [ ] SSL certificate valide
- [ ] Backup initial créé
- [ ] Test de login réussi
- [ ] Test de partie réussie
- [ ] Pas d'erreur en production

---

## 🎉 Vous êtes prêt à la production!

Votre site CyberLearn est maintenant **100% sécurisé et prêt pour production**.

Pour toute question de sécurité, consultez:
- `SECURITY-GUIDE.md`
- `src/lib/SECURITY-CHECKLIST.ts`
- `SECURITY-IMPLEMENTATION-SUMMARY.md`
