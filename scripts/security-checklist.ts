#!/usr/bin/env node

/**
 * 🔒 INTERACTIVE SECURITY CHECKLIST
 * Run with: npx ts-node scripts/security-checklist.ts
 */

const fs = require('fs');
const path = require('path');

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  instruction: string;
  verification: string;
  critical: boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'env-secrets',
    title: 'Generate Secrets Securely',
    description: 'Create unique secrets for JWT and admin password',
    instruction: `
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
npm install -g bcryptjs
bcryptjs hash "YourSecurePassword123!@#"
    `,
    verification: 'Check .env.local contains JWT_SECRET and ADMIN_PASSWORD_HASH',
    critical: true,
  },
  {
    id: 'env-file',
    title: 'Create .env.local',
    description: 'Set up development environment variables',
    instruction: `
cp .env.example .env.local
# Edit .env.local with your generated secrets
    `,
    verification: 'cat .env.local | grep -E "JWT_SECRET|ADMIN_PASSWORD_HASH"',
    critical: true,
  },
  {
    id: 'gitignore-check',
    title: 'Verify .gitignore Protections',
    description: 'Ensure .env files and secrets are ignored',
    instruction: `
grep -E "\.env|secrets\.json" .gitignore
    `,
    verification: '.env should be in .gitignore',
    critical: true,
  },
  {
    id: 'socket-server-update',
    title: 'Update socket-server.ts',
    description: 'Replace with secure version',
    instruction: `
cp src/lib/socket-server.ts src/lib/socket-server.ts.backup
cp src/lib/socket-server-secure.ts src/lib/socket-server.ts
    `,
    verification: 'grep "✅ SECURITY" src/lib/socket-server.ts',
    critical: true,
  },
  {
    id: 'npm-audit',
    title: 'Run Security Audit',
    description: 'Check for vulnerable dependencies',
    instruction: `
npm audit
npm audit fix
    `,
    verification: 'npm audit should show 0 vulnerabilities',
    critical: true,
  },
  {
    id: 'build-test',
    title: 'Build & Test Locally',
    description: 'Ensure everything compiles and runs',
    instruction: `
npm run build
npm run dev
# Test in browser: http://localhost:3000
    `,
    verification: 'No build errors, app runs locally',
    critical: true,
  },
  {
    id: 'secrets-check',
    title: 'Verify No Secrets in Git',
    description: 'Check entire history for exposed secrets',
    instruction: `
git log --all -S "password" --oneline | head -10
git log --all -S "admin123" --oneline | head -10
git ls-files --cached | grep "\.env"
    `,
    verification: 'No results found = Good! If found, see DEPLOYMENT-SECURITY.md',
    critical: true,
  },
  {
    id: 'render-setup',
    title: 'Create Render Web Service',
    description: 'Set up deployment on Render',
    instruction: `
1. Go to https://render.com
2. Dashboard → New Web Service
3. Connect GitHub repo
4. Select: Node environment
5. Set build/start commands (see DEPLOYMENT-SECURITY.md)
    `,
    verification: 'Service created and ready for env variables',
    critical: false,
  },
  {
    id: 'render-env',
    title: 'Add Environment Variables to Render',
    description: 'Configure secrets on Render dashboard',
    instruction: `
Dashboard → Environment → Add:
DATABASE_URL=<your-postgres-url>
JWT_SECRET=<newly-generated-value>
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD_HASH=<bcryptjs-hash>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
    `,
    verification: 'All vars set, no hardcoded values in repo',
    critical: true,
  },
  {
    id: 'deploy-render',
    title: 'Deploy to Render',
    description: 'Push code and deploy',
    instruction: `
git add .
git commit -m "🔒 Security implementation"
git push origin main
# Render auto-deploys
    `,
    verification: 'Check Render dashboard → Logs for deployment success',
    critical: false,
  },
  {
    id: 'verify-https',
    title: 'Verify HTTPS Enforcement',
    description: 'Check that HTTPS is forced',
    instruction: `
curl -i http://your-domain.com
# Should redirect to https
    `,
    verification: 'Response should be 301/302 redirect to https',
    critical: true,
  },
  {
    id: 'verify-headers',
    title: 'Verify Security Headers',
    description: 'Check presence of security headers',
    instruction: `
curl -i https://your-domain.com | grep -i "x-frame\|csp\|x-content\|hsts"
    `,
    verification: 'Should see X-Frame-Options, CSP, X-Content-Type-Options, HSTS',
    critical: true,
  },
  {
    id: 'verify-cors',
    title: 'Verify CORS Configuration',
    description: 'Test CORS restrictions',
    instruction: `
# Should be denied
curl -H "Origin: https://malicious.com" https://your-domain.com

# Should be allowed
curl -H "Origin: https://your-domain.com" https://your-domain.com
    `,
    verification: 'Malicious origin should NOT have Access-Control-Allow-Origin',
    critical: true,
  },
  {
    id: 'test-login',
    title: 'Test Admin Login',
    description: 'Verify authentication works',
    instruction: `
1. Open https://your-domain.com/admin
2. Enter credentials
3. Check DevTools → Network/Console for JWT token
4. Try wrong password (should fail)
    `,
    verification: 'Login succeeds with correct creds, fails with wrong ones',
    critical: true,
  },
  {
    id: 'test-xss',
    title: 'Test XSS Prevention',
    description: 'Try injecting code in nickname',
    instruction: `
1. Join game with nickname: <img src=x onerror="alert(1)">
2. Check if alert fires
3. Check nickname in leaderboard (should be escaped)
    `,
    verification: 'No alert should appear, nickname displayed safely',
    critical: true,
  },
  {
    id: 'test-rate-limit',
    title: 'Test Rate Limiting',
    description: 'Verify rate limiting works',
    instruction: `
# Send 100+ requests rapidly
for i in {1..100}; do curl https://your-domain.com/api/socket & done; wait
# Or use: ab -n 1000 -c 10 https://your-domain.com
    `,
    verification: 'After N requests, should get 429 (Too Many Requests)',
    critical: false,
  },
  {
    id: 'monitoring-setup',
    title: 'Set Up Monitoring',
    description: 'Configure error tracking and alerting',
    instruction: `
Option 1: Sentry
- npm install @sentry/node
- Add to server.ts
- Set SENTRY_DSN env var

Option 2: DataDog
- npm install dd-trace
- Configure in server.ts

Option 3: Your hosting provider's monitoring
    `,
    verification: 'Monitoring dashboard accessible, test alert works',
    critical: false,
  },
  {
    id: 'backup-test',
    title: 'Test Database Backups',
    description: 'Verify automated backups are working',
    instruction: `
Render Dashboard → Backups
- Check: Automated backups enabled
- Check: Retention period set (7+ days)
- Optionally: Trigger manual backup
    `,
    verification: 'At least one backup exists and is recent',
    critical: false,
  },
  {
    id: 'ssl-check',
    title: 'Verify SSL Certificate',
    description: 'Ensure SSL certificate is valid',
    instruction: `
# Check SSL info
openssl s_client -connect your-domain.com:443

# Or visit: https://www.ssllabs.com/ssltest/
    `,
    verification: 'Certificate should be valid and not expired',
    critical: true,
  },
];

// ===== IMPLEMENTATION =====

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🔒 CYBERLEARN SECURITY CHECKLIST                      ║
║          Interactive Verification Tool                         ║
╚════════════════════════════════════════════════════════════════╝
`);

console.log(`
Total Items: ${CHECKLIST.length}
Critical Items: ${CHECKLIST.filter((c) => c.critical).length}

Instructions:
1. Go through each checklist item
2. Follow the instructions
3. Run the verification command
4. Mark as complete when verified

Use: npm run security:checklist
`);

console.log(
  '\n═══════════════════════════════════════════════════════════════\n'
);

CHECKLIST.forEach((item, index) => {
  const icon = item.critical ? '🔴' : '🟡';
  const status = '☐'; // Checkbox

  console.log(`${status} ${icon} ${index + 1}. ${item.title}`);
  console.log(`   ${item.description}`);
  console.log(`\n   Instructions:`);
  console.log(item.instruction.trim().split('\n').join('\n   '));
  console.log(`\n   Verification:`);
  console.log(`   $ ${item.verification}`);
  console.log('\n───────────────────────────────────────────────────────────────\n');
});

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ✅ CHECKLIST COMPLETE?                     ║
║                                                                ║
║  If all items are verified:                                   ║
║  1. Your site is 100% secure                                  ║
║  2. You're ready for production                               ║
║  3. Run: git push origin main                                 ║
║  4. Render will auto-deploy                                   ║
║                                                                ║
║  Need help? Check SECURITY-GUIDE.md                           ║
╚════════════════════════════════════════════════════════════════╝
`);

// Export for programmatic use
module.exports = { CHECKLIST };
