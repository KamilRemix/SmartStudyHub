/**
 * Utilities for formatting and parsing LaTeX formulas in SmartStudyHub
 */

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

const GREEK_MAP: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ',
  sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'φ',
  varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
  Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const OPERATOR_MAP: Record<string, string> = {
  pm: '±', mp: '∓', times: '×', div: '÷', cdot: '·',
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
  approx: '≈', sim: '∼', equiv: '≡', cong: '≅',
  infty: '∞', int: '∫', iint: '∬', iiint: '∭', oint: '∮',
  sum: '∑', prod: '∏', coprod: '∐',
  to: '→', rightarrow: '→', leftarrow: '←', Leftarrow: '⇐',
  Rightarrow: '⇒', leftrightarrow: '↔', Leftrightarrow: '⇔',
  partial: '∂', nabla: '∇', in: '∈', notin: '∉', ni: '∋',
  subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
  cup: '∪', cap: '∩', empty: '∅', emptyset: '∅',
  forall: '∀', exists: '∃', nexists: '∄',
  neg: '¬', land: '∧', lor: '∨',
  quad: '   ', qquad: '      ',
};

function toSuperscript(str: string): string {
  return str.split('').map((ch) => SUPERSCRIPTS[ch] || ch).join('');
}

function toSubscript(str: string): string {
  return str.split('').map((ch) => SUBSCRIPTS[ch] || ch).join('');
}

export function formatLatexToReadable(rawFormula: string): string {
  let s = rawFormula.trim();

  // Strip wrapping $$ or $ or \[ \]
  if (s.startsWith('$$') && s.endsWith('$$')) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('\\[') && s.endsWith('\\]')) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('$') && s.endsWith('$')) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('\\(') && s.endsWith('\\)')) {
    s = s.slice(2, -2).trim();
  }

  // Handle \sqrt[n]{x}
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, (_, n, x) => `${toSuperscript(n)}√(${x})`);
  // Handle \sqrt{x}
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

  // Handle \frac{a}{b} -> (a) / (b) or a/b
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
    const cleanNum = num.trim();
    const cleanDen = den.trim();
    const simple = /^[a-zA-Z0-9+\-*]+$/;
    if (simple.test(cleanNum) && simple.test(cleanDen)) {
      return `${cleanNum} / ${cleanDen}`;
    }
    return `(${cleanNum}) / (${cleanDen})`;
  });

  // Handle Greek letters
  for (const [name, sym] of Object.entries(GREEK_MAP)) {
    s = s.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), sym);
  }

  // Handle Operators
  for (const [name, sym] of Object.entries(OPERATOR_MAP)) {
    s = s.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), ` ${sym} `);
  }

  // Superscripts x^{abc} and x^2
  s = s.replace(/\^\{([^}]+)\}/g, (_, exp) => toSuperscript(exp));
  s = s.replace(/\^([0-9a-zA-Z+\-])/g, (_, exp) => toSuperscript(exp));

  // Subscripts x_{abc} and x_1
  s = s.replace(/_\{([^}]+)\}/g, (_, sub) => toSubscript(sub));
  s = s.replace(/_([0-9a-zA-Z+\-])/g, (_, sub) => toSubscript(sub));

  // Common math functions formatting
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|exp|lim|max|min|det|deg)(?![a-zA-Z])/g, '$1');

  // Clean spacing and braces
  s = s.replace(/\\,/g, ' ')
       .replace(/\\;/g, ' ')
       .replace(/\\!/g, '')
       .replace(/\\left\(/g, '(')
       .replace(/\\right\)/g, ')')
       .replace(/\\left\[/g, '[')
       .replace(/\\right\]/g, ']')
       .replace(/\\left\\{/g, '{')
       .replace(/\\right\\}/g, '}')
       .replace(/\\cdot/g, '·')
       .replace(/[{}]/g, '')
       .replace(/\s+/g, ' ')
       .trim();

  return s;
}

export interface FractionPart {
  numerator: string;
  denominator: string;
}

export function extractMainFraction(formula: string): FractionPart | null {
  const match = formula.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
  if (match) {
    return {
      numerator: formatLatexToReadable(match[1]),
      denominator: formatLatexToReadable(match[2]),
    };
  }
  return null;
}
