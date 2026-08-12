# 🔒 GUIDE COMPLET DE SÉCURITÉ - CyberLearn

## 📋 Table des matières

1. [Configuration de sécurité](#configuration)
2. [Authentification](#authentification)
3. [Données utilisateur](#données-utilisateur)
4. [Socket.IO](#socketio)
5. [Headers de sécurité](#headers)
6. [Protection des secrets](#secrets)
7. [Rate Limiting](#rate-limiting)
8. [Audit & Logging](#audit)
9. [Checklist de déploiement](#checklist-déploiement)

---

## 🔧 Configuration

### Variables d'environnement

**En production sur Render**, définissez TOUTES ces variables :

```env
# Base de données
DATABASE_URL="postgresql://..."

# Authentification
JWT_SECRET="<32+ caractères aléatoires>"
ADMIN_EMAIL="your-email@domain.com"
ADMIN_PASSWORD_HASH="<hash bcryptjs généré>"

# Domaine
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
NODE_ENV="production"

# Sécurité
ENABLE_HTTPS="true"
CORS_ALLOWED_ORIGINS="https://votre-domaine.com"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
SOCKET_RATE_LIMIT_WINDOW_MS="1000"
SOCKET_RATE_LIMIT_MAX_EVENTS="10"
```

### Générer des secrets sécurisés

```bash
# JWT_SECRET (32+ caractères hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD_HASH
npm install -g bcryptjs
bcryptjs hash "VotreMotDePasseSuperSecurisé123!"
```

---

## 🔐 Authentification

### Points critiques

1. **✅ Hash des mots de passe**
   - Toujours hasher avec bcryptjs (coût ≥ 12)
   - Jamais stocker en plaintext
   - Vérifier côté serveur uniquement

2. **✅ Tokens JWT**
   - Expiration 24h maximum
   - Secret fort et changé régulièrement
   - Jamais d'informations sensibles dans le payload

3. **✅ Sessions**
   - Timeout après 30 minutes d'inactivité
   - Stocker sur le serveur (memory store ou Redis)
   - Valider à chaque action

### Exemple d'utilisation

```typescript
// Dans socket-server.ts
import { validateAdminCredentials, createAdminToken } from "./secure-auth";

socket.on("admin:login", async ({ email, password }, callback) => {
  // ✅ Vérifier les credentials
  const result = await validateAdminCredentials(email, password);
  
  if (!result.valid) {
    return callback({ success: false, message: result.message });
  }

  // ✅ Créer un JWT token
  const token = await createAdminToken(email);
  
  // ✅ Stocker dans socket.data (serveur uniquement)
  socket.data.adminToken = token;
  socket.data.isAdmin = true;
  
  callback({ success: true, token });
});
```

---

## 🛡️ Données utilisateur

### Nicknames

```typescript
import { sanitizeNickname, escapeHtml } from "./security-utils";

// ✅ TOUJOURS nettoyer les nicknames
const clean = sanitizeNickname(userInput);

// ✅ TOUJOURS échapper à l'affichage
const display = escapeHtml(clean);

// ❌ NE PAS faire :
const bad = `<script>${userInput}</script>`; // XSS!
```

### Validation

```typescript
// Longueur
if (nickname.length < 2 || nickname.length > 50) {
  // Rejeter
}

// Caractères autorisés
if (!/^[a-zA-Z0-9 _-]+$/.test(nickname)) {
  // Rejeter
}

// Pseudo unique par partie
const exists = game.players.some(p => 
  p.nickname.toLowerCase() === nickname.toLowerCase()
);
if (exists) {
  // Rejeter: déjà pris
}
```

---

## 🔌 Socket.IO

### Validation de chaque événement

**MODÈLE À SUIVRE:**

```typescript
socket.on("EVENT_NAME", async ({ param1, param2 }, callback) => {
  // 1. Rate limiting
  if (socketRateLimiter.isLimited(socketKey)) {
    return callback({ success: false, error: "Rate limited" });
  }

  // 2. Vérifier l'authentification
  if (!socket.data.playerId && !socket.data.isAdmin) {
    return callback({ success: false, error: "Not authenticated" });
  }

  // 3. Vérifier les permissions
  if (requiresAdmin && !socket.data.isAdmin) {
    return callback({ success: false, error: "Admin required" });
  }

  // 4. Valider les entrées
  if (!param1 || typeof param1 !== "string") {
    return callback({ success: false, error: "Invalid input" });
  }

  // 5. Vérifier l'état de la partie
  const game = getActiveGame(socket.data.gameId);
  if (!game || game.phase !== "expected_phase") {
    return callback({ success: false, error: "Invalid game state" });
  }

  // 6. Exécuter l'action
  try {
    // Votre logique métier...
    callback({ success: true, data: result });
  } catch (error) {
    callback({ success: false, error: "Server error" });
  }
});
```

### Vérifications spéciales

**Avant d'accepter une réponse:**
```typescript
// ✅ 1. Le joueur existe dans la partie
const player = game.players.get(playerId);
if (!player) throw new Error("Player not in game");

// ✅ 2. La question est valide
const question = getQuestionById(questionId);
if (!question) throw new Error("Question not found");

// ✅ 3. Le choix est valide
const option = question.options.find(o => o.id === optionId);
if (!option) throw new Error("Invalid option");

// ✅ 4. Vérifier la réponse CÔTÉ SERVEUR
const isCorrect = option.isCorrect; // Jamais du client!

// ✅ 5. Calculer les points (avec vérification du temps serveur)
const serverTime = Date.now();
const points = calculatePoints(isCorrect, serverTime, questionStartTime);
```

### Configuration CORS

```typescript
cors: {
  // ✅ UNIQUEMENT votre domaine
  origin: process.env.NEXT_PUBLIC_APP_URL, // "https://cyberlearn.com"
  
  // ✅ Méthodes minimales
  methods: ["GET", "POST"],
  
  // ✅ Cookies sécurisés
  credentials: true,
}
```

---

## 🌐 Headers de sécurité

**À implémenter dans `middleware.ts`:**

```typescript
// Content Security Policy
response.headers.set(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
);

// Anti-clickjacking
response.headers.set("X-Frame-Options", "DENY");

// Anti-MIME sniffing
response.headers.set("X-Content-Type-Options", "nosniff");

// Anti-XSS
response.headers.set("X-XSS-Protection", "1; mode=block");

// Referrer Policy
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

// Permissions
response.headers.set("Permissions-Policy", "camera=(), microphone=()");

// HSTS (production seulement)
if (process.env.NODE_ENV === "production") {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
}
```

---

## 🔑 Protection des secrets

### ✅ À FAIRE

- Variables d'environnement sur Render (dashboard)
- Hashes bcryptjs pour les mots de passe
- Tokens JWT signés
- Secrets cryptés en base de données

### ❌ À NE PAS FAIRE

- `.env` dans GitHub
- Secrets en plaintext dans le code
- Afficher les erreurs détaillées au client
- Logger les secrets

### Vérifier les fuites

```bash
# Avant de pusher sur GitHub
git diff --staged | grep -i "password\|secret\|token\|api"

# Ou utiliser pre-commit hooks
npm install husky lint-staged
```

---

## 🚦 Rate Limiting

### Implémenter sur les routes sensibles

```typescript
// Nom de la route + IP du client
const rateLimitKey = `${route}:${ip}`;

if (rateLimiter.isLimited(rateLimitKey)) {
  return res.status(429).json({
    error: "Trop de requêtes. Réessayez dans 15 minutes."
  });
}
```

### Limites recommandées

- Login: 5 tentatives par 15 min
- Créer partie: 10 parties par 24h
- Player join: 1 par seconde par joueur
- Messages Socket.IO: 10 par seconde

---

## 📊 Audit & Logging

### Événements à logger

```typescript
// Tentative de login (succès ou échec)
logSecurityEvent("auth_attempt", {
  email,
  success: true/false,
  ip: socket.remoteAddress,
  timestamp: new Date()
});

// Accès non autorisé
logSecurityEvent("unauthorized_access", {
  userId,
  action: "host:create-game",
  reason: "Not admin",
  ip: socket.remoteAddress
});

// Manipulation de score détectée
logSecurityEvent("score_manipulation", {
  playerId,
  gameId,
  suspiciousData: { clientScore, serverScore },
  ip: socket.remoteAddress
});

// Action administrateur
logSecurityEvent("admin_action", {
  adminEmail,
  action: "kicked player",
  targetPlayerId,
  gameId
});
```

### Stockage des logs

```typescript
// Option 1: Base de données
await prisma.securityLog.create({
  data: { eventType, details: JSON.stringify(details) }
});

// Option 2: Fichier (production)
fs.appendFileSync(
  "/var/log/cyberlearn-security.log",
  JSON.stringify({ timestamp: new Date(), ...details })
);

// Option 3: Service externe (ex: DataDog, Sentry)
sentryClient.captureEvent({
  level: "info",
  category: "security",
  message: eventType,
  extra: details
});
```

---

## ✅ Checklist de déploiement

### Avant de pousser en production

- [ ] Tous les `.env*` sauf `.env.example` dans `.gitignore`
- [ ] JWT_SECRET généré et stocké sur Render
- [ ] ADMIN_PASSWORD_HASH généré avec bcryptjs
- [ ] HTTPS forcé en production
- [ ] CORS limité au domaine (pas de `*`)
- [ ] Headers de sécurité présents
- [ ] Rate limiting activé
- [ ] Secrets NOT dans les logs
- [ ] Base de données sécurisée (pas sur localhost)
- [ ] Backups configurées
- [ ] SSL/TLS certificate valide
- [ ] WAF (Web Application Firewall) activé si disponible

### Vérifications de sécurité

```bash
# Chercher les secrets exposés
git log --all -S "password" --pretty=format:"%h %s"

# Vérifier les headers
curl -i https://cyberlearn.com | grep -i "x-frame\|x-content\|csp"

# Tester CORS
curl -H "Origin: https://malicious.com" -v https://cyberlearn.com
# Ne doit PAS renvoyer "Access-Control-Allow-Origin"

# Test de rate limiting
for i in {1..100}; do curl https://cyberlearn.com/api/socket; done
# Doit retourner 429 après N requêtes
```

### Monitoring en production

1. **Alertes**
   - Tentatives de login échouées (> 10/jour)
   - Accès non autorisés détectés
   - Manipulations de score
   - Erreurs 5xx

2. **Métriques**
   - Nombre de connexions Socket.IO
   - Temps de réponse des requêtes
   - Taille des payloads
   - Erreurs de base de données

3. **Logs**
   - Tous les événements de sécurité
   - Erreurs serveur
   - Performances anormales

---

## 🚀 Déploiement sur Render

### 1. Ajouter les variables d'environnement

Dashboard Render → Environment → Add Environment Variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=<généré>
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD_HASH=<bcryptjs hash>
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NODE_ENV=production
```

### 2. Configurer HTTPS automatique

Render génère un certificat SSL gratuitement. Configurer le domain custom.

### 3. Ajouter un health check

```typescript
// Dans pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ status: "ok" });
}
```

### 4. Build & Deploy

```bash
# Push sur GitHub (sûr car secrets sur Render)
git push

# Render déploie automatiquement
```

---

## 🎓 Ressources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Socket.IO Security](https://socket.io/docs/v4/server-socket-instance/#secure-namespaces)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
