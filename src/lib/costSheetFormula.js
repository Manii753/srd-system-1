// Excel-style formula engine for custom cost sheets.
//
// Supported syntax:
//   =B5*C5        arithmetic with cell references (letters + row number)
//   =A1+A2*2      standard precedence, parentheses
//   =10% + 5      percent literals
//   =B{row}*C{row}  the special {row} token is replaced with the current row
//   =SUM(B2:B10)  functions: SUM, AVG/AVERAGE, MIN, MAX, COUNT, ROUND, ABS, IF
//   =IF(A1>10, 5, 0)  comparison operators: = <> < <= > >=
//
// Blank/empty cells evaluate to 0. Unparseable input returns null (rendered
// as #ERR! in the grid). No eval() is used anywhere.

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isFiniteNumber(v) {
  return typeof v === 'number' && isFinite(v);
}

const n = (v) => {
  const x = Number(v);
  return isFiniteNumber(x) ? x : 0;
};

// 0-indexed column position -> Excel letter(s). e.g. 0 -> 'A', 25 -> 'Z', 26 -> 'AA'
export function columnKeyFromIndex(idx) {
  let x = idx + 1;
  let s = '';
  while (x > 0) {
    const m = (x - 1) % 26;
    s = LETTERS[m] + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// Excel letters -> 0-indexed column position. e.g. 'A' -> 0, 'AA' -> 26, 'AB' -> 27
export function columnIndexFromLetters(letters) {
  let v = 0;
  for (const ch of String(letters || '').toUpperCase()) {
    const i = LETTERS.indexOf(ch);
    if (i < 0) return -1;
    v = v * 26 + (i + 1);
  }
  return v - 1;
}

function parseCell(ref) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(String(ref));
  if (!m) return null;
  return { col: columnIndexFromLetters(m[1]), row: parseInt(m[2], 10) };
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isAlpha = (c) => /[A-Za-z]/.test(c);

  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i += 1; continue; }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] || ''))) {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j += 1;
      tokens.push({ type: 'number', value: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }

    if (isAlpha(c)) {
      let j = i;
      while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]))) j += 1;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }

    const two = src.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '<>' || two === '==') {
      tokens.push({ type: 'cmp', value: two === '==' ? '=' : two });
      i += 2;
      continue;
    }

    switch (c) {
      case '+': tokens.push({ type: 'add' }); break;
      case '-': tokens.push({ type: 'sub' }); break;
      case '*': tokens.push({ type: 'mul' }); break;
      case '/': tokens.push({ type: 'div' }); break;
      case '^': tokens.push({ type: 'pow' }); break;
      case '%': tokens.push({ type: 'pct' }); break;
      case '(': tokens.push({ type: 'lparen' }); break;
      case ')': tokens.push({ type: 'rparen' }); break;
      case ',': tokens.push({ type: 'comma' }); break;
      case ':': tokens.push({ type: 'colon' }); break;
      case '<': tokens.push({ type: 'cmp', value: '<' }); break;
      case '>': tokens.push({ type: 'cmp', value: '>' }); break;
      case '=': tokens.push({ type: 'cmp', value: '=' }); break;
      default: throw new Error(`Unexpected character "${c}"`);
    }
    i += 1;
  }
  return tokens;
}

function applyCmp(op, a, b) {
  const x = n(a); const y = n(b);
  switch (op) {
    case '=':  return x === y ? 1 : 0;
    case '<>': return x !== y ? 1 : 0;
    case '<':  return x < y ? 1 : 0;
    case '<=': return x <= y ? 1 : 0;
    case '>':  return x > y ? 1 : 0;
    case '>=': return x >= y ? 1 : 0;
    default: return 0;
  }
}

function flattenArgs(args) {
  const out = [];
  args.forEach(a => {
    if (Array.isArray(a)) out.push(...a);
    else out.push(a);
  });
  return out;
}

function callFunction(name, args) {
  switch (name) {
    case 'SUM': {
      const all = flattenArgs(args);
      return all.reduce((s, v) => s + n(v), 0);
    }
    case 'AVG':
    case 'AVERAGE': {
      const all = flattenArgs(args).map(n);
      const nums = all.filter(isFiniteNumber);
      return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
    }
    case 'MIN': {
      const nums = flattenArgs(args).map(n).filter(isFiniteNumber);
      return nums.length ? Math.min(...nums) : 0;
    }
    case 'MAX': {
      const nums = flattenArgs(args).map(n).filter(isFiniteNumber);
      return nums.length ? Math.max(...nums) : 0;
    }
    case 'COUNT':
      return flattenArgs(args).map(n).filter(isFiniteNumber).length;
    case 'ROUND': {
      const v = n(args[0]);
      const digits = n(args[1]);
      const p = Math.pow(10, digits);
      return Math.round(v * p) / p;
    }
    case 'ABS':
      return Math.abs(n(args[0]));
    case 'IF':
      return n(args[0]) ? n(args[1]) : (args[2] === undefined ? 0 : n(args[2]));
    default:
      return 0;
  }
}

class Parser {
  constructor(tokens, ctx) {
    this.tokens = tokens;
    this.i = 0;
    this.ctx = ctx;
  }

  peek() { return this.tokens[this.i]; }
  next() { return this.tokens[this.i++]; }

  expect(type) {
    const tk = this.next();
    if (!tk || tk.type !== type) throw new Error('Syntax error');
    return tk;
  }

  parse() {
    if (this.tokens.length === 0) throw new Error('Empty expression');
    const v = this.comparison();
    if (this.i < this.tokens.length) throw new Error('Trailing tokens');
    return v;
  }

  comparison() {
    let left = this.additive();
    while (this.peek() && this.peek().type === 'cmp') {
      const op = this.next().value;
      const right = this.additive();
      left = applyCmp(op, left, right);
    }
    return left;
  }

  additive() {
    let left = this.multiplicative();
    while (this.peek() && (this.peek().type === 'add' || this.peek().type === 'sub')) {
      const isAdd = this.next().type === 'add';
      const right = this.multiplicative();
      left = n(left) + (isAdd ? n(right) : -n(right));
    }
    return left;
  }

  multiplicative() {
    let left = this.pow();
    while (this.peek() && (this.peek().type === 'mul' || this.peek().type === 'div')) {
      const isMul = this.next().type === 'mul';
      const right = this.pow();
      const rn = n(right);
      left = isMul ? n(left) * rn : (rn === 0 ? NaN : n(left) / rn);
    }
    return left;
  }

  pow() {
    const left = this.unary();
    if (this.peek() && this.peek().type === 'pow') {
      this.next();
      const right = this.unary();
      return Math.pow(n(left), n(right));
    }
    return left;
  }

  unary() {
    if (this.peek() && this.peek().type === 'sub') { this.next(); return -n(this.unary()); }
    if (this.peek() && this.peek().type === 'add') { this.next(); return n(this.unary()); }
    return this.primary();
  }

  primary() {
    const tk = this.peek();
    if (!tk) throw new Error('Unexpected end of expression');

    let v;

    if (tk.type === 'number') {
      this.next();
      v = tk.value;
    } else if (tk.type === 'lparen') {
      this.next();
      v = this.comparison();
      this.expect('rparen');
    } else if (tk.type === 'ident') {
      this.next();

      // Function call: SUM(B2:B10), ROUND(A1,2), ...
      if (this.peek() && this.peek().type === 'lparen') {
        this.next();
        const args = [];
        if (!(this.peek() && this.peek().type === 'rparen')) {
          for (;;) {
            args.push(this.arg());
            if (this.peek() && this.peek().type === 'comma') { this.next(); continue; }
            break;
          }
        }
        this.expect('rparen');
        v = callFunction(tk.value.toUpperCase(), args);
      } else if (/^[A-Za-z]+\d+$/.test(tk.value)) {
        // Cell reference: A1, B{row} already substituted, AB12
        v = this.cell(tk.value);
      } else {
        // Unknown identifier (e.g. a label used in a formula) -> 0
        v = 0;
      }
    } else {
      throw new Error('Expression error');
    }

    // Percent suffix works on any value: 10% -> 0.1, A1% -> cell/100
    if (this.peek() && this.peek().type === 'pct') {
      this.next();
      v = n(v) / 100;
    }
    return v;
  }

  // A function argument is either a range (A1:B4) or a scalar expression.
  arg() {
    if (this.peek() && this.peek().type === 'ident') {
      const first = this.next();
      if (this.peek() && this.peek().type === 'colon') {
        this.next();
        const second = this.tokens[this.i];
        if (!second || second.type !== 'ident') throw new Error('Invalid range');
        this.next();
        const a = parseCell(first.value);
        const b = parseCell(second.value);
        if (!a || !b) throw new Error('Invalid range');
        const c1 = Math.min(a.col, b.col); const c2 = Math.max(a.col, b.col);
        const r1 = Math.min(a.row, b.row); const r2 = Math.max(a.row, b.row);
        const vals = [];
        for (let r = r1; r <= r2; r += 1) {
          for (let c = c1; c <= c2; c += 1) {
            vals.push(this.cell(columnKeyFromIndex(c) + r));
          }
        }
        return vals;
      }
      this.i -= 1; // rewind; treat as normal expression
    }
    return this.comparison();
  }

  cell(ref) {
    const p = parseCell(ref);
    if (!p) return 0;
    const key = columnKeyFromIndex(p.col);
    const raw = this.ctx.getCell ? this.ctx.getCell(key, p.row) : 0;
    const v = Number(raw);
    return isFiniteNumber(v) ? v : 0;
  }
}

// Substitute the {row} token, tokenize and evaluate.
// ctx = { rowIndex, getCell(colKey, rowNumber) => number|string|undefined }
export function evaluateFormula(rawExpr, ctx) {
  if (rawExpr == null) return null;
  let src = String(rawExpr).trim();
  if (src.startsWith('=')) src = src.slice(1).trim();
  if (!src) return null;

  src = src.replace(/\{row\}/gi, String(ctx.rowIndex || 1));

  try {
    const parser = new Parser(tokenize(src), ctx);
    const v = parser.parse();
    return isFiniteNumber(v) ? v : null;
  } catch {
    return null;
  }
}