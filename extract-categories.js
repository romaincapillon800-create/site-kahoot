const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));
const categories = [...new Set(data.map(q => q.category))].sort();
console.log('Categories in questions.json:');
categories.forEach(cat => console.log(`  - ${cat}`));
console.log(`\nTotal: ${categories.length}`);
