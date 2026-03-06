const fs = require('fs');
const path = 'eslint.config.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /'@typescript-eslint\/no-unused-vars': \['error', { 'argsIgnorePattern': '\^_' }\],/g;
const replacement = `'@typescript-eslint/no-unused-vars': ['error', { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
console.log('Fixed eslint.config.js config for underscore variables');
