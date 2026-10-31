import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const src = read('src/main.js')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim();

const bookmarklet = 'javascript:' + encodeURIComponent(src);
fs.writeFileSync(path.join(root, 'bookmarklet.txt'), bookmarklet + '\n', 'utf8');

const tpl = read('install.tpl.html');
const html = tpl
  .replaceAll('{{BOOKMARKLET}}', bookmarklet)
  .replaceAll('{{LENGTH}}', String(bookmarklet.length));
fs.writeFileSync(path.join(root, 'install.html'), html, 'utf8');

console.log('bookmarklet 长度: ' + bookmarklet.length);
console.log('已生成 bookmarklet.txt / install.html');