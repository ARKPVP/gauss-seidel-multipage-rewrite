# Code Review — peemai950/gauss_seidel_multipage_math.io

Review date: 2026-09-30

## Scope reviewed

Repository default branch `main`, root files:
- `app.js`
- `index.html`
- `input.html`
- `settings.html`
- `formulas.html`
- `steps.html`
- `results.html`
- `style.css`
- `README.md`

The URL supplied in the request points to `/tree/main/gauss_seidel_multipage_math`, but that directory currently returns 404. The active code is at the repository root.

## Important findings

1. **Blank numeric inputs can silently become zero.**
   The original input page uses `Number(input.value)`. In JavaScript, `Number("") === 0`, so an omitted coefficient can be accepted as a real zero rather than rejected.

2. **The stopping rule in the original code does not match the provided textbook Example 3.6.**
   Original solver stops with `max(|x_new - x_old|) < tolerance`. The provided Chapter 4 example uses a relative convergence error based on the last updated variable in the sweep. This is why a direct reproduction of the book should use a separate selectable criterion.

3. **Calculation logic is duplicated.**
   `gaussSeidel()` exists in `app.js`, while `steps.html` implements another solver loop independently. Any future change can make the displayed steps disagree with the results page.

4. **No uniqueness / consistency validation.**
   The original code checks shape, finite values, nonzero diagonal after row permutation, tolerance, and iteration count, but does not reject inconsistent systems or systems without a unique solution before iteration.

5. **No residual check.**
   A small update between iterations does not automatically mean `Ax ≈ b`. The original output does not show `||b - Ax||∞`.

6. **The built-in example has no source documented in the repository.**
   The rewrite replaces the default sample with Example 3.6 from the provided `NUM-Chapter-04 (1).pdf`, so every built-in coefficient has a traceable source.

7. **Settings are saved before validation.**
   The original settings page writes `x0`, tolerance, and max iterations then navigates immediately. Invalid settings are only discovered later.

8. **Six-decimal display can hide useful numerical detail.**
   The original `fmt()` rounds to six decimals everywhere. The rewrite keeps a more conservative significant-digit display and still stores full double-precision values internally.

9. **Row reordering is mathematically valid but not fully explained in the calculation pages.**
   The original implementation reorders whole equations to repair zero diagonal entries. The rewrite exposes the original row numbers on the formula page and states the actual order used.

## Rewrite decisions

- One shared numerical core: `gauss-seidel.js`.
- No random/example generator.
- Built-in sample is the provided textbook Example 3.6 only.
- Empty numeric fields are rejected.
- System consistency and uniqueness are pre-checked numerically; this check is validation only, not the solver.
- Gauss-Seidel itself remains the solution method.
- Row swaps move the full equation and right-hand side together; variable order is unchanged.
- Three selectable stopping criteria:
  - textbook last-variable relative error,
  - maximum relative update,
  - maximum absolute update.
- Residual infinity norm is reported independently.
- Diagonal-dominance and Sassenfeld diagnostics are reported as sufficient-condition diagnostics, not promises.
- Iteration details are rendered from the same data produced by the solver, eliminating duplicate math logic.
- Automated tests reproduce the first two textbook iterations and the 22-iteration stopping point for Example 3.6.

## Verified textbook sample

After the necessary whole-row reorder, the working system order is original equations `1, 3, 2, 4`, giving:

- Iteration 1: `[-5.5, 15.5, 16.125, -3.675]`
- Iteration 2: `[0.2375, -32.1625, 8.953125, 12.808125]`
- With `ε = 0.0001` and the textbook last-variable relative criterion: convergence at iteration 22.

Automated tests assert these values directly.
