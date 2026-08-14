const questions = require('./src/data/questions.json');

// Categories in data
const dataCategories = [...new Set(questions.map(q => q.category))].sort();

// Categories in category-selector
const selectorCategories = [
  "kerberos", "active-directory", "ldap-injection", "oauth", "jwt",
  "app-script", "app-systeme",
  "windows-internals", "linux", "privilege-escalation",
  "cracking", "cryptanalyse",
  "cloud-aws", "azure", "gcp",
  "docker", "kubernetes",
  "reseau",
  "web-client", "web-server", "owasp",
  "sql-injection", "xxe", "ssrf", "csrf",
  "cryptography", "pki", "tls",
  "malware", "rootkits", "ransomware",
  "reverse-engineering", "yara",
  "forensics", "siem", "logs", "sigma",
  "rce", "buffer-overflow", "race-conditions",
  "mitre-attack", "threat-hunting"
].sort();

console.log("📊 COMPARAISON DES CATÉGORIES\n");

const missingInData = selectorCategories.filter(c => !dataCategories.includes(c));
const missingInSelector = dataCategories.filter(c => !selectorCategories.includes(c));

console.log("❌ Dans le sélecteur mais PAS dans les données:");
missingInData.forEach(c => console.log(`  - ${c}`));

console.log("\n⚠️  Dans les données mais PAS dans le sélecteur:");
missingInSelector.forEach(c => console.log(`  - ${c}`));

console.log(`\n✅ Total données: ${dataCategories.length}`);
console.log(`✅ Total sélecteur: ${selectorCategories.length}`);
console.log(`\n📋 Catégories en données:\n${dataCategories.join(', ')}`);
