'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const GS = require('../gauss-seidel.js');

function close(actual, expected, tol = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected} within ${tol}`);
}

test('Example 3.6 is sourced and row-reordered as the textbook calculation', () => {
  const s = GS.cloneTextbookExample();
  const prepared = GS.prepareSystem(s);
  assert.deepEqual(prepared.rowOrder, [0, 2, 1, 3]);
  assert.deepEqual(prepared.A, [
    [2, 3, -2, 7],
    [0, 2, 5, -4],
    [5, 0, 4, 0],
    [6, 2, 3, 5]
  ]);
  assert.deepEqual(prepared.b, [-11, 31, 37, 28]);
});

test('Example 3.6 first iteration matches the document', () => {
  const r = GS.gaussSeidel(GS.cloneTextbookExample());
  const x = r.history[0].values;
  close(x[0], -5.5);
  close(x[1], 15.5);
  close(x[2], 16.125);
  close(x[3], -3.675);
  close(r.history[0].error, 1);
});

test('Example 3.6 second iteration matches the document', () => {
  const r = GS.gaussSeidel(GS.cloneTextbookExample());
  const x = r.history[1].values;
  close(x[0], 0.2375);
  close(x[1], -32.1625);
  close(x[2], 8.953125);
  close(x[3], 12.808125);
  close(r.history[1].error, 1.2869272434489827, 1e-12);
});

test('Textbook stopping criterion converges at iteration 22 for Example 3.6', () => {
  const r = GS.gaussSeidel(GS.cloneTextbookExample());
  assert.equal(r.converged, true);
  assert.equal(r.history.length, 22);
  close(r.solution[0], 4.999981573299891, 1e-12);
  close(r.solution[1], 1.999839882798657, 1e-12);
  close(r.solution[2], 3.000023033375136, 1e-12);
  close(r.solution[3], -2.999927661104414, 1e-12);
  assert.ok(r.history.at(-1).error < 1e-4);
});

test('Gauss-Seidel uses fresh values within the same iteration', () => {
  const s = {
    n: 2,
    A: [[4, 1], [2, 3]],
    b: [1, 2],
    x0: [0, 0],
    tolerance: 1e-12,
    maxIterations: 2,
    criterion: 'max-relative',
    autoReorder: true
  };
  const r = GS.gaussSeidel(s);
  close(r.history[0].values[0], 0.25);
  close(r.history[0].values[1], 0.5); // uses x1=0.25 immediately: (2 - 2*0.25)/3
});

test('Blank/null coefficients are rejected instead of becoming zero', () => {
  const s = GS.createEmptyState(2);
  assert.throws(() => GS.prepareSystem(s), /ห้ามเว้นว่าง|ตัวเลขจริง/);
});

test('Inconsistent systems are rejected', () => {
  const s = {
    n: 2,
    A: [[1, 1], [2, 2]],
    b: [1, 3],
    x0: [0, 0],
    tolerance: 1e-6,
    maxIterations: 50,
    criterion: 'max-relative',
    autoReorder: true
  };
  assert.throws(() => GS.prepareSystem(s), /ไม่สอดคล้องกัน/);
});

test('Systems without a unique solution are rejected', () => {
  const s = {
    n: 2,
    A: [[1, 1], [2, 2]],
    b: [1, 2],
    x0: [0, 0],
    tolerance: 1e-6,
    maxIterations: 50,
    criterion: 'max-relative',
    autoReorder: true
  };
  assert.throws(() => GS.prepareSystem(s), /ไม่มีคำตอบเอกลักษณ์/);
});

test('Residual is computed from the actual A, x, b values', () => {
  const A = [[2, 1], [1, 3]];
  const x = [1, 2];
  const b = [4, 8];
  const r = GS.computeResidual(A, x, b);
  assert.deepEqual(r.vector, [0, 1]);
  assert.equal(r.normInf, 1);
});
