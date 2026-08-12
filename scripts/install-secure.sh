#!/bin/bash

# 🔒 INSTALLATION SÉCURISÉE DE CYBERLEARN
# Ce script configure toutes les protections de sécurité

echo "🔒 Installation sécurisée de CyberLearn..."
echo ""

# ===== 1. DÉPENDANCES =====
echo "📦 Installation des dépendances..."
npm install

# ===== 2. CONFIGURATION ENVIRONNEMENT =====
echo ""
echo "⚙️  Configuration de l'environnement..."

if [ ! -f .env.local ]; then
  echo "📋 Créer .env.local avec vos variables:"
  echo ""
  echo "DATABASE_URL=postgresql://user:password@localhost:5432/cyberlearn"
  echo "JWT_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  echo "ADMIN_EMAIL=admin@cyberlearn.local"
  echo "ADMIN_PASSWORD_HASH=<générer avec: npx bcryptjs hash 'votreMotDePasse'>"
  echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
  echo "NODE_ENV=development"
  echo ""
  echo "Créez le fichier .env.local avec ces valeurs"
  exit 1
fi

# ===== 3. PRISMA SETUP =====
echo ""
echo "🗄️  Configuration de la base de données..."
npm run db:generate
npm run db:push
npm run db:seed

# ===== 4. BUILD =====
echo ""
echo "🏗️  Compilation TypeScript..."
npm run build

# ===== 5. VÉRIFICATIONS DE SÉCURITÉ =====
echo ""
echo "🔍 Vérifications de sécurité..."

# Check for exposed secrets
echo -n "  ✓ Vérification des secrets exposés... "
if git log --all -S "password" --pretty=format:"%h %s" 2>/dev/null | grep -q .; then
  echo "⚠️  ATTENTION: Mots de passe trouvés dans l'historique Git!"
else
  echo "✅"
fi

# Check .env in git
echo -n "  ✓ Vérification que .env n'est pas suivi... "
if git ls-files --cached | grep -q "^\\.env"; then
  echo "⚠️  ATTENTION: .env est suivi par Git!"
  echo "     Exécuter: git rm --cached .env"
else
  echo "✅"
fi

# Check node_modules
echo -n "  ✓ Vérification que node_modules n'est pas suivi... "
if git ls-files --cached | grep -q "^node_modules"; then
  echo "⚠️  ATTENTION: node_modules est suivi par Git!"
else
  echo "✅"
fi

# ===== 6. RÉSUMÉ =====
echo ""
echo "✅ Installation sécurisée terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Éditer .env.local avec vos secrets"
echo "  2. Tester en local: npm run dev"
echo "  3. Pour la production sur Render:"
echo "     - Définir les variables d'env sur le dashboard Render"
echo "     - Activer HTTPS automatique"
echo "     - Configurer les backups de base de données"
echo ""
echo "🔒 N'oubliez pas:"
echo "  - Jamais commiter .env ou secrets.json"
echo "  - Générer des secrets différents pour chaque environnement"
echo "  - Vérifier les logs de sécurité régulièrement"
echo "  - Mettre à jour les dépendances: npm audit"
echo ""
