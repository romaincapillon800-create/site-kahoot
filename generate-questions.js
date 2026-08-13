const fs = require('fs');

const allQuestions = [];

// Categories avec leurs questions
const data = {
  kerberos: [
    ['Quel composant Kerberos délivre le ticket ?', 'TGT', 'ST', 'PAC', 'KDC'],
    ['Qu\'est-ce qu\'un TGT ?', 'Un ticket pour obtenir un ST', 'Un mot de passe', 'Une clé', 'Un cert'],
    ['Qu\'est-ce qu\'un Golden Ticket ?', 'Un TGT forgé avec le hash KRBTGT', 'Un certificat', 'Un mot de passe', 'Un hash'],
  ],
  'active-directory': [
    ['Qu\'est-ce qu\'un SID ?', 'Un identifiant unique d\'un objet AD', 'Un mot de passe', 'Un hash', 'Un cert'],
    ['Quel attribut LDAP identifie un utilisateur ?', 'samAccountName', 'SID', 'SPN', 'GUID'],
    ['Quel objet peut contenir des groupes ?', 'Le domaine', 'Le service web', 'Le patch', 'Le noyau'],
  ],
  reseau: [
    ['Quel protocole TCP/IP est au niveau couche 4 ?', 'TCP', 'IP', 'HTTP', 'DNS'],
    ['Quel modèle défini les 7 couches réseau ?', 'OSI', 'TCP/IP', 'HTTP', 'DHCP'],
    ['Quel port est utilisé par SSH par défaut ?', '22', '23', '80', '443'],
    ['Qu\'est-ce qu\'une adresse IP privée ?', '192.168.x.x, 10.x.x.x', '8.8.8.8', '1.1.1.1', 'google.com'],
    ['Quel protocole sécurise le trafic HTTP ?', 'HTTPS', 'HTTPs', 'HTTP2', 'SSL seul'],
  ],
  malware: [
    ['Qu\'est-ce qu\'un virus ?', 'Logiciel qui se propage en se reproduisant', 'Un patch', 'Un cert', 'Le noyau'],
    ['Qu\'est-ce qu\'un ver ?', 'Malware auto-réplicatif sur le réseau', 'Un script JS', 'Un scanner', 'Un JWT'],
    ['Qu\'est-ce qu\'un Trojan ?', 'Logiciel apparemment inoffensif mais malveillant', 'Un GPO', 'Un SIEM', 'Une règle'],
    ['Que fait un botnet ?', 'Regroupe des machines contrôlées à distance', 'Bloque le CPU', 'Chiffre', 'Supprime'],
  ],
  'cloud-aws': [
    ['Qu\'est-ce qu\'un bucket S3 public ?', 'Un stockage exposé publiquement', 'Un conteneur', 'Un groupe', 'Un service'],
    ['Quel service AWS sert aux calculs ?', 'EC2', 'Lambda', 'S3', 'IAM'],
    ['Que permet une IAM policy trop permissive ?', 'Accès excessif à un service', 'Diminuer le CPU', 'Bloquer DNS', 'Créer cert'],
  ],
  azure: [
    ['Quel service Azure stocke les secrets ?', 'Key Vault', 'Storage Blob', 'VMSS', 'AAD'],
    ['Qu\'est-ce qu\'un NSG ?', 'Network Security Group', 'Name Service Group', 'No Security', 'Access Key'],
    ['Quelle unité de sécurité module les accès ?', 'RBAC', 'S3', 'QPS', 'IPAM'],
  ],
  jwt: [
    ['Qu\'est-ce qu\'un JWT ?', 'Un token signé encodé en base64', 'Un hash MD5', 'Un cert X509', 'Un cookie'],
    ['Quelle partie du JWT contient les données ?', 'Payload', 'Header', 'Signature', 'Nonce'],
    ['Qu\'est-ce que la signature JWT protège ?', 'L\'intégrité du token', 'La taille du navig', 'Le DNS', 'Le firewall'],
  ],
  'sql-injection': [
    ['Que permet une injection SQL ?', 'Manipuler la requête SQL', 'Désactiver cookies', 'Ralentir CPU', 'Chiffrer disque'],
    ['Comment se défendre ?', 'Prepared statements', 'Utiliser HTTP', 'Désactiver logs', 'Supprimer regex'],
    ['Qu\'est-ce qu\'une SQLi boolean-based ?', 'Injection dépend d\'une condition', 'Un bug navigateur', 'Un type upload', 'Un pivot DNS'],
  ],
};

// Générer les questions
for (const [catId, questions] of Object.entries(data)) {
  for (const q of questions) {
    const [title, answer, ...falseChoices] = q;
    const options = [
      { text: answer, isCorrect: true },
      { text: falseChoices[0] || 'Option A', isCorrect: false },
      { text: falseChoices[1] || 'Option B', isCorrect: false },
      { text: falseChoices[2] || 'Option C', isCorrect: false }
    ];
    allQuestions.push({
      text: title,
      category: catId,
      explanation: 'La bonne réponse est : ' + answer,
      options
    });
  }
}

fs.writeFileSync('./src/data/questions.json', JSON.stringify(allQuestions, null, 2));
console.log('✅ Généré', allQuestions.length, 'questions');
console.log('📊 Catégories:', [...new Set(allQuestions.map(q => q.category))].sort());
