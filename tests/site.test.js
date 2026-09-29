'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html','input.html','settings.html','formulas.html','steps.html','results.html'];

test('all six pages and shared assets exist', () => {
  for (const file of [...pages, 'style.css', 'app.js', 'gauss-seidel.js']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
  }
});

test('each page links the shared calculation module before app.js', () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const core = html.indexOf('src="gauss-seidel.js"');
    const app = html.indexOf('src="app.js"');
    assert.ok(core >= 0, `${file}: missing gauss-seidel.js`);
    assert.ok(app > core, `${file}: app.js must load after gauss-seidel.js`);
  }
});

test('navigation targets are present', () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const target of pages) assert.ok(html.includes(`href="${target}"`), `${file}: missing link to ${target}`);
  }
});
