(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GaussSeidel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '2.0.0';
  const MIN_N = 2;
  const MAX_N = 8;

  // ตัวอย่าง 3.6 จาก NUM-Chapter-04 (1).pdf หน้า 38-40
  // ไม่มีการสุ่มหรือสร้างตัวเลขตัวอย่างขึ้นเอง
  const TEXTBOOK_EXAMPLE = Object.freeze({
    n: 4,
    A: Object.freeze([
      Object.freeze([2, 3, -2, 7]),
      Object.freeze([5, 0, 4, 0]),
      Object.freeze([0, 2, 5, -4]),
      Object.freeze([6, 2, 3, 5])
    ]),
    b: Object.freeze([-11, 37, 31, 28]),
    x0: Object.freeze([0, 0, 0, 0]),
    tolerance: 0.0001,
    maxIterations: 100,
    criterion: 'textbook-last-relative',
    autoReorder: true,
    source: 'NUM-Chapter-04 (1).pdf, Example 3.6, pp. 38-40'
  });

  function cloneTextbookExample() {
    return {
      n: TEXTBOOK_EXAMPLE.n,
      A: TEXTBOOK_EXAMPLE.A.map(row => [...row]),
      b: [...TEXTBOOK_EXAMPLE.b],
      x0: [...TEXTBOOK_EXAMPLE.x0],
      tolerance: TEXTBOOK_EXAMPLE.tolerance,
      maxIterations: TEXTBOOK_EXAMPLE.maxIterations,
      criterion: TEXTBOOK_EXAMPLE.criterion,
      autoReorder: TEXTBOOK_EXAMPLE.autoReorder,
      source: TEXTBOOK_EXAMPLE.source
    };
  }

  function createEmptyState(n = 3) {
    if (!Number.isInteger(n) || n < MIN_N || n > MAX_N) n = 3;
    return {
      n,
      A: Array.from({ length: n }, () => Array(n).fill(null)),
      b: Array(n).fill(null),
      x0: Array(n).fill(0),
      tolerance: 0.0001,
      maxIterations: 100,
      criterion: 'max-relative',
      autoReorder: true,
      source: 'user-input'
    };
  }

  function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function deepCloneState(s) {
    return {
      ...s,
      A: Array.isArray(s?.A) ? s.A.map(row => Array.isArray(row) ? [...row] : row) : s?.A,
      b: Array.isArray(s?.b) ? [...s.b] : s?.b,
      x0: Array.isArray(s?.x0) ? [...s.x0] : s?.x0
    };
  }

  function maxAbsInMatrix(A) {
    let m = 0;
    for (const row of A) for (const v of row) m = Math.max(m, Math.abs(v));
    return m;
  }

  function numericalThreshold(A) {
    return 1e-12 * Math.max(1, maxAbsInMatrix(A));
  }

  function validateShapeAndNumbers(s) {
    if (!s || !Number.isInteger(s.n) || s.n < MIN_N || s.n > MAX_N) {
      throw new Error(`จำนวนตัวแปรต้องเป็นจำนวนเต็ม ${MIN_N}-${MAX_N}`);
    }
    const n = s.n;
    if (!Array.isArray(s.A) || s.A.length !== n) {
      throw new Error('เมทริกซ์ A มีจำนวนแถวไม่ตรงกับจำนวนตัวแปร');
    }
    for (let i = 0; i < n; i++) {
      if (!Array.isArray(s.A[i]) || s.A[i].length !== n) {
        throw new Error(`แถวที่ ${i + 1} ของเมทริกซ์ A มีจำนวนสมาชิกไม่ครบ`);
      }
      for (let j = 0; j < n; j++) {
        if (!isFiniteNumber(s.A[i][j])) {
          throw new Error(`a${i + 1}${j + 1} ต้องเป็นตัวเลขจริงที่มีค่าจำกัด และห้ามเว้นว่าง`);
        }
      }
    }
    if (!Array.isArray(s.b) || s.b.length !== n || s.b.some(v => !isFiniteNumber(v))) {
      throw new Error('เวกเตอร์ b ต้องมีตัวเลขจริงครบทุกสมการ และห้ามเว้นว่าง');
    }
    if (!Array.isArray(s.x0) || s.x0.length !== n || s.x0.some(v => !isFiniteNumber(v))) {
      throw new Error('ค่าเริ่มต้น x⁽⁰⁾ ต้องเป็นตัวเลขจริงครบทุกตัวแปร');
    }
    if (!isFiniteNumber(s.tolerance) || s.tolerance <= 0) {
      throw new Error('Tolerance ต้องเป็นตัวเลขจริงที่มากกว่า 0');
    }
    if (!Number.isInteger(s.maxIterations) || s.maxIterations < 1 || s.maxIterations > 10000) {
      throw new Error('Max Iterations ต้องเป็นจำนวนเต็ม 1-10000');
    }
    const allowed = new Set(['textbook-last-relative', 'max-relative', 'max-absolute']);
    if (!allowed.has(s.criterion)) {
      throw new Error('เกณฑ์หยุดการคำนวณไม่ถูกต้อง');
    }
  }

  function matrixRank(M, threshold) {
    const a = M.map(row => [...row]);
    const rows = a.length;
    const cols = a[0]?.length || 0;
    let rank = 0;
    let col = 0;
    while (rank < rows && col < cols) {
      let pivot = rank;
      for (let r = rank + 1; r < rows; r++) {
        if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
      }
      if (Math.abs(a[pivot][col]) <= threshold) {
        col++;
        continue;
      }
      [a[rank], a[pivot]] = [a[pivot], a[rank]];
      const p = a[rank][col];
      for (let r = rank + 1; r < rows; r++) {
        const factor = a[r][col] / p;
        if (Math.abs(factor) <= threshold) continue;
        for (let c = col; c < cols; c++) a[r][c] -= factor * a[rank][c];
      }
      rank++;
      col++;
    }
    return rank;
  }

  function validateUniqueSystem(A, b) {
    const threshold = numericalThreshold(A);
    const rankA = matrixRank(A, threshold);
    const augmented = A.map((row, i) => [...row, b[i]]);
    const augScale = Math.max(maxAbsInMatrix(A), ...b.map(Math.abs), 1);
    const rankAug = matrixRank(augmented, 1e-12 * augScale);
    if (rankAug > rankA) {
      throw new Error('ระบบสมการไม่สอดคล้องกัน (ไม่มีคำตอบร่วม) จึงใช้ Gauss–Seidel หาเฉลยไม่ได้');
    }
    if (rankA < A.length) {
      throw new Error('ระบบสมการไม่มีคำตอบเอกลักษณ์ (มีได้หลายคำตอบ) จึงไม่เหมาะกับการคำนวณนี้');
    }
    return { rankA, rankAug };
  }

  // หาการสลับ "ทั้งแถวสมการ" ที่ทำให้แนวทแยงไม่เป็นศูนย์
  // เลือกการสลับที่เปลี่ยนลำดับเดิมน้อยที่สุด เพื่อไม่เปลี่ยนโจทย์เกินจำเป็น
  function findRowPermutation(A, threshold = numericalThreshold(A)) {
    const n = A.length;
    const identity = Array.from({ length: n }, (_, i) => i);
    if (identity.every((row, col) => Math.abs(A[row][col]) > threshold)) return identity;

    let best = null;
    let bestCost = Infinity;
    const used = Array(n).fill(false);
    const order = Array(n).fill(-1);

    function lexicographicallySmaller(a, b) {
      if (!b) return true;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
      }
      return false;
    }

    function search(col, cost) {
      if (cost > bestCost) return;
      if (col === n) {
        if (cost < bestCost || (cost === bestCost && lexicographicallySmaller(order, best))) {
          best = [...order];
          bestCost = cost;
        }
        return;
      }
      const candidates = Array.from({ length: n }, (_, r) => r)
        .filter(r => !used[r] && Math.abs(A[r][col]) > threshold)
        .sort((r1, r2) => Math.abs(r1 - col) - Math.abs(r2 - col) || r1 - r2);
      for (const row of candidates) {
        used[row] = true;
        order[col] = row;
        search(col + 1, cost + Math.abs(row - col));
        used[row] = false;
      }
    }

    search(0, 0);
    return best;
  }

  function prepareSystem(raw) {
    const s = deepCloneState(raw);
    validateShapeAndNumbers(s);
    validateUniqueSystem(s.A, s.b);
    const threshold = numericalThreshold(s.A);
    let order = Array.from({ length: s.n }, (_, i) => i);

    if (order.some((row, col) => Math.abs(s.A[row][col]) <= threshold)) {
      if (!s.autoReorder) {
        throw new Error('มีสมาชิกบนแนวทแยงเป็นศูนย์/ใกล้ศูนย์ กรุณาสลับสมการหรือเปิดการสลับแถวอัตโนมัติ');
      }
      const found = findRowPermutation(s.A, threshold);
      if (!found) {
        throw new Error('ไม่สามารถสลับแถวสมการให้สมาชิกบนแนวทแยงทุกตัวไม่เป็นศูนย์ได้');
      }
      order = found;
    }

    const A = order.map(r => [...s.A[r]]);
    const b = order.map(r => s.b[r]);
    for (let i = 0; i < s.n; i++) {
      if (Math.abs(A[i][i]) <= threshold) {
        throw new Error(`a${i + 1}${i + 1} เป็นศูนย์/ใกล้ศูนย์ จึงหารในสูตร Gauss–Seidel ไม่ได้`);
      }
    }

    return { ...s, A, b, rowOrder: order, pivotThreshold: threshold };
  }

  function classifyDiagonalDominance(A) {
    let allStrict = true;
    let allWeak = true;
    let atLeastOneStrict = false;
    const rows = A.map((row, i) => {
      const diagonal = Math.abs(row[i]);
      const offDiagonal = row.reduce((sum, v, j) => j === i ? sum : sum + Math.abs(v), 0);
      const strict = diagonal > offDiagonal;
      const weak = diagonal >= offDiagonal;
      allStrict = allStrict && strict;
      allWeak = allWeak && weak;
      atLeastOneStrict = atLeastOneStrict || strict;
      return { row: i, diagonal, offDiagonal, strict, weak };
    });
    let type = 'none';
    if (allStrict) type = 'strict';
    else if (allWeak && atLeastOneStrict) type = 'weak';
    return { type, rows };
  }

  function sassenfeldCriterion(A) {
    const n = A.length;
    const beta = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        sum += Math.abs(A[i][j]) * (j < i ? beta[j] : 1);
      }
      beta[i] = sum / Math.abs(A[i][i]);
    }
    const betaMax = Math.max(...beta);
    return { beta, betaMax, sufficient: betaMax < 1 };
  }

  function computeResidual(A, x, b) {
    const vector = A.map((row, i) => b[i] - row.reduce((sum, aij, j) => sum + aij * x[j], 0));
    const normInf = Math.max(...vector.map(v => Math.abs(v)));
    return { vector, normInf };
  }

  function relativeApproxError(newValue, oldValue) {
    const delta = Math.abs(newValue - oldValue);
    if (newValue === 0) return delta;
    return delta / Math.abs(newValue);
  }

  function stoppingError(criterion, current, previous) {
    const absErrors = current.map((v, i) => Math.abs(v - previous[i]));
    const relErrors = current.map((v, i) => relativeApproxError(v, previous[i]));
    if (criterion === 'textbook-last-relative') {
      return { value: relErrors[relErrors.length - 1], absErrors, relErrors };
    }
    if (criterion === 'max-absolute') {
      return { value: Math.max(...absErrors), absErrors, relErrors };
    }
    return { value: Math.max(...relErrors), absErrors, relErrors };
  }

  function gaussSeidel(raw) {
    const s = prepareSystem(raw);
    const { A, b, n, tolerance, maxIterations, criterion } = s;
    let x = [...s.x0];
    const history = [];
    const detailedSteps = [];
    let converged = false;
    let status = 'max-iterations';

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const previous = [...x];
      const lines = [];

      for (let i = 0; i < n; i++) {
        const terms = [];
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const valueUsed = x[j]; // j<i เป็นค่าใหม่ของรอบนี้, j>i ยังเป็นค่ารอบก่อน
          const product = A[i][j] * valueUsed;
          sum += product;
          if (A[i][j] !== 0) {
            terms.push({
              j,
              coefficient: A[i][j],
              valueUsed,
              product,
              sourceIteration: j < i ? iteration : iteration - 1
            });
          }
        }
        const numerator = b[i] - sum;
        const newValue = numerator / A[i][i];
        if (!Number.isFinite(newValue)) {
          status = 'non-finite';
          return {
            prepared: s,
            solution: [...x], history, detailedSteps,
            converged: false, status,
            diagnostics: systemDiagnostics(s)
          };
        }
        lines.push({
          i,
          diagonal: A[i][i],
          rhs: b[i],
          terms,
          numerator,
          oldValue: previous[i],
          newValue
        });
        x[i] = newValue;
      }

      const err = stoppingError(criterion, x, previous);
      const residual = computeResidual(A, x, b);
      const row = {
        iteration,
        values: [...x],
        previous,
        error: err.value,
        absoluteErrors: err.absErrors,
        relativeErrors: err.relErrors,
        residual: residual.normInf,
        residualVector: residual.vector
      };
      history.push(row);
      detailedSteps.push({ iteration, lines, ...row });

      if (err.value <= tolerance) {
        converged = true;
        status = 'converged';
        break;
      }
    }

    return {
      prepared: s,
      solution: [...x],
      history,
      detailedSteps,
      converged,
      status,
      diagnostics: systemDiagnostics(s)
    };
  }

  function systemDiagnostics(prepared) {
    return {
      diagonalDominance: classifyDiagonalDominance(prepared.A),
      sassenfeld: sassenfeldCriterion(prepared.A)
    };
  }

  function formatNumber(value, significant = 10) {
    if (!Number.isFinite(value)) return String(value);
    if (Object.is(value, -0)) value = 0;
    if (value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 1e8 || abs < 1e-6) return value.toExponential(Math.max(2, significant - 1));
    return Number(value.toPrecision(significant)).toString();
  }

  return {
    VERSION,
    MIN_N,
    MAX_N,
    TEXTBOOK_EXAMPLE,
    cloneTextbookExample,
    createEmptyState,
    isFiniteNumber,
    validateShapeAndNumbers,
    validateUniqueSystem,
    findRowPermutation,
    prepareSystem,
    classifyDiagonalDominance,
    sassenfeldCriterion,
    computeResidual,
    relativeApproxError,
    stoppingError,
    gaussSeidel,
    systemDiagnostics,
    formatNumber
  };
});
