/**
 * A safe arithmetic evaluator — deliberately NOT `eval`/`Function`.
 * Tokenize → shunting-yard to RPN → evaluate. Supports + - * / % ^, parens,
 * and unary minus. Any stray character is rejected. This is the kind of tool
 * you actually want an agent calling: total, auditable, no code execution.
 */
const OPS: Record<string, { prec: number; right?: boolean }> = {
  "+": { prec: 1 },
  "-": { prec: 1 },
  "*": { prec: 2 },
  "/": { prec: 2 },
  "%": { prec: 2 },
  "^": { prec: 3, right: true },
};

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "paren"; v: "(" | ")" };

export function tokenize(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c >= "0" && c <= "9" || c === ".") {
      let j = i + 1;
      while (j < expr.length && (expr[j] >= "0" && expr[j] <= "9" || expr[j] === ".")) j++;
      const v = Number(expr.slice(i, j));
      if (!Number.isFinite(v)) throw new Error(`bad number "${expr.slice(i, j)}"`);
      toks.push({ t: "num", v });
      i = j;
      continue;
    }
    if (c === "(" || c === ")") { toks.push({ t: "paren", v: c }); i++; continue; }
    if (c in OPS) { toks.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`unexpected character "${c}"`);
  }
  return toks;
}

export function evaluate(expr: string): number {
  const toks = tokenize(expr);
  const out: Tok[] = [];
  const stack: Tok[] = [];
  let prev: Tok | undefined;

  for (const tok of toks) {
    if (tok.t === "num") {
      out.push(tok);
    } else if (tok.t === "op") {
      // Unary minus/plus: an operator at the start or after another operator/'('.
      const unary = (tok.v === "-" || tok.v === "+") &&
        (!prev || (prev.t === "op") || (prev.t === "paren" && prev.v === "("));
      if (unary) {
        out.push({ t: "num", v: 0 }); // rewrite  -x  as  0 - x
      }
      while (
        stack.length &&
        stack[stack.length - 1].t === "op" &&
        (() => {
          const top = stack[stack.length - 1] as { t: "op"; v: string };
          const a = OPS[top.v], b = OPS[tok.v];
          return a.prec > b.prec || (a.prec === b.prec && !b.right);
        })()
      ) {
        out.push(stack.pop() as Tok);
      }
      stack.push(tok);
    } else if (tok.v === "(") {
      stack.push(tok);
    } else {
      let found = false;
      while (stack.length) {
        const top = stack.pop() as Tok;
        if (top.t === "paren" && top.v === "(") { found = true; break; }
        out.push(top);
      }
      if (!found) throw new Error("mismatched parentheses");
    }
    prev = tok;
  }
  while (stack.length) {
    const top = stack.pop() as Tok;
    if (top.t === "paren") throw new Error("mismatched parentheses");
    out.push(top);
  }

  const nums: number[] = [];
  for (const tok of out) {
    if (tok.t === "num") { nums.push(tok.v); continue; }
    const b = nums.pop();
    const a = nums.pop();
    if (a === undefined || b === undefined) throw new Error("malformed expression");
    switch (tok.v) {
      case "+": nums.push(a + b); break;
      case "-": nums.push(a - b); break;
      case "*": nums.push(a * b); break;
      case "/":
        if (b === 0) throw new Error("division by zero");
        nums.push(a / b); break;
      case "%":
        if (b === 0) throw new Error("modulo by zero");
        nums.push(a % b); break;
      case "^": nums.push(a ** b); break;
    }
  }
  if (nums.length !== 1) throw new Error("malformed expression");
  return nums[0];
}
