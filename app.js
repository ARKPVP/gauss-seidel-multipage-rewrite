'use strict';

const GS = window.GaussSeidel;
const STORAGE_KEY = 'gaussSeidelProjectV2';
const LEGACY_KEY = 'gaussSeidelProject';
const DISPLAY_MODE_KEY = 'gaussSeidelDisplayMode';

function migrateState(s) {
  if (!s || typeof s !== 'object') return GS.cloneTextbookExample();
  const n = Number.isInteger(s.n) ? s.n : 3;
  const numericOrNull = v => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  };
  return {
    n,
    A: Array.isArray(s.A) ? s.A.map(row => Array.isArray(row) ? row.map(numericOrNull) : row) : GS.createEmptyState(n).A,
    b: Array.isArray(s.b) ? s.b.map(numericOrNull) : GS.createEmptyState(n).b,
    x0: Array.isArray(s.x0) ? s.x0.map(Number) : Array(n).fill(0),
    tolerance: Number.isFinite(Number(s.tolerance)) ? Number(s.tolerance) : 0.0001,
    maxIterations: Number.isInteger(Number(s.maxIterations)) ? Number(s.maxIterations) : 100,
    criterion: ['textbook-last-relative', 'max-relative', 'max-absolute'].includes(s.criterion) ? s.criterion : 'max-relative',
    autoReorder: s.autoReorder !== false,
    source: typeof s.source === 'string' ? s.source : 'user-input'
  };
}

function getState() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return GS.cloneTextbookExample();
  try {
    return migrateState(JSON.parse(raw));
  } catch (_) {
    return GS.cloneTextbookExample();
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function loadTextbookExample() {
  const s = GS.cloneTextbookExample();
  saveState(s);
  return s;
}

function parseNumericInput(el, label) {
  const text = String(el.value ?? '').trim();
  if (text === '') throw new Error(`${label} ห้ามเว้นว่าง`);
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`${label} ต้องเป็นตัวเลขจริงที่มีค่าจำกัด`);
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getDisplayMode() {
  return localStorage.getItem(DISPLAY_MODE_KEY) === 'fixed-4' ? 'fixed-4' : 'precise';
}

function fmt(v, sig = 10) {
  if (getDisplayMode() === 'fixed-4' && Number.isFinite(v)) {
    return Number(v).toFixed(4);
  }
  return GS.formatNumber(v, sig);
}

function addPrecisionToggle() {
  const nav = document.querySelector('.nav-inner');
  if (!nav || document.getElementById('precisionToggle')) return;

  const button = document.createElement('button');
  button.id = 'precisionToggle';
  button.type = 'button';
  button.className = 'precision-toggle';
  button.title = 'เปลี่ยนเฉพาะรูปแบบการแสดงผล ไม่เปลี่ยนค่าที่ใช้คำนวณ';

  const refreshLabel = () => {
    const fixed = getDisplayMode() === 'fixed-4';
    button.textContent = fixed ? 'ทศนิยม 4 ตำแหน่ง ✓' : 'ทศนิยม 4 ตำแหน่ง';
    button.setAttribute('aria-pressed', String(fixed));
  };

  refreshLabel();
  button.addEventListener('click', () => {
    const next = getDisplayMode() === 'fixed-4' ? 'precise' : 'fixed-4';
    localStorage.setItem(DISPLAY_MODE_KEY, next);
    location.reload();
  });

  nav.appendChild(button);
}

function xVar(i, iteration = null) {
  const sup = iteration === null ? '' : `<sup>(${iteration})</sup>`;
  return `<i>x</i><sub>${i}</sub>${sup}`;
}

function aVar(i, j) {
  return `<i>a</i><sub>${i}${j}</sub>`;
}

function bVar(i) {
  return `<i>b</i><sub>${i}</sub>`;
}

function fracHTML(num, den) {
  return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
}

function signedTermHTML(coef, variableHTML, first = false) {
  if (coef === 0) return '';
  const abs = Math.abs(coef);
  const coeff = abs === 1 ? '' : fmt(abs);
  if (first) return `${coef < 0 ? '−' : ''}${coeff}${variableHTML}`;
  return `${coef < 0 ? ' − ' : ' + '}${coeff}${variableHTML}`;
}

function originalEquationHTML(A, b, i) {
  let html = '';
  let first = true;
  for (let j = 0; j < A.length; j++) {
    if (A[i][j] === 0) continue;
    html += signedTermHTML(A[i][j], xVar(j + 1), first);
    first = false;
  }
  if (first) html = '0';
  return `${html} = ${fmt(b[i])}`;
}

function rearrangedEquationHTML(A, b, i) {
  let numerator = fmt(b[i]);
  for (let j = 0; j < A.length; j++) {
    if (j === i || A[i][j] === 0) continue;
    numerator += signedTermHTML(-A[i][j], xVar(j + 1), false);
  }
  return `${xVar(i + 1)} = ${fracHTML(numerator, fmt(A[i][i]))}`;
}

function generalFormulaHTML() {
  return `${xVar('i', 'k+1')} = ${fracHTML(
    `${bVar('i')} − Σ<sub>j&lt;i</sub> ${aVar('ij', '')}${xVar('j', 'k+1')} − Σ<sub>j&gt;i</sub> ${aVar('ij', '')}${xVar('j', 'k')}`,
    aVar('ii', '')
  )}`;
}

function criterionLabel(key) {
  const labels = {
    'textbook-last-relative': 'ตามเอกสาร: Relative error ของตัวแปรสุดท้าย xₙ',
    'max-relative': 'Max relative update ของทุกตัวแปร',
    'max-absolute': 'Max absolute update ของทุกตัวแปร'
  };
  return labels[key] || key;
}

function rowOrderMessage(prepared) {
  if (!prepared.rowOrder.some((row, i) => row !== i)) return '';
  return `<div class="message info"><strong>สลับแถวสมการอัตโนมัติ:</strong> ใช้สมการเดิมในลำดับ ${prepared.rowOrder.map(r => r + 1).join(' → ')} เพื่อให้สมาชิกบนแนวทแยงไม่เป็นศูนย์ โดยสลับทั้งสัมประสิทธิ์และค่า b พร้อมกัน</div>`;
}

function diagnosticHTML(prepared) {
  const d = GS.systemDiagnostics(prepared);
  const dd = d.diagonalDominance;
  const sf = d.sassenfeld;
  let dominanceText;
  if (dd.type === 'strict') dominanceText = 'Strict diagonal dominance: ผ่านเงื่อนไขเพียงพอที่ใช้สนับสนุนการลู่เข้า';
  else if (dd.type === 'weak') dominanceText = 'Weak diagonal dominance: มีโครงสร้างที่ช่วยการลู่เข้า แต่ไม่ใช่การรับประกันทั่วไป';
  else dominanceText = 'ไม่เป็น diagonally dominant: ยังอาจลู่เข้าได้ แต่เงื่อนไขนี้ไม่ช่วยรับประกัน';
  const sassText = sf.sufficient
    ? `Sassenfeld βmax = ${fmt(sf.betaMax)} < 1: ผ่านเงื่อนไขเพียงพอสำหรับการลู่เข้า`
    : `Sassenfeld βmax = ${fmt(sf.betaMax)} ≥ 1: เกณฑ์นี้ไม่รับประกันการลู่เข้า`;
  return `<div class="diagnostic-grid">
    <div class="diagnostic-card"><strong>Diagonal dominance</strong><span>${dominanceText}</span></div>
    <div class="diagnostic-card"><strong>Sassenfeld criterion</strong><span>${sassText}</span></div>
  </div>`;
}

function showMessage(target, message, type = 'warning') {
  target.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
}

function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
  addPrecisionToggle();
}

document.addEventListener('DOMContentLoaded', setActiveNav);
