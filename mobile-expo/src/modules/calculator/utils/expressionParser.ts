/**
 * Mathematical Expression Parser using Shunting-Yard Algorithm to RPN
 * Supports:
 * - Basic arithmetic (+, -, *, /)
 * - Display operators (×, ÷)
 * - Parentheses precedence
 * - Unary negation (-)
 * - Percentage scaling (%)
 * - Implicit multiplication (e.g., 5(2+3) -> 5*(2+3))
 * - 12-digit precision formatting
 */

export function formatPrecision(val: number): string {
  if (!Number.isFinite(val) || Number.isNaN(val)) return 'Error';
  const precise = parseFloat(val.toPrecision(12));
  if (Math.abs(precise) >= 1e12 || (Math.abs(precise) > 0 && Math.abs(precise) < 1e-6)) {
    return precise.toExponential(6).replace('e+', 'e');
  }
  return precise.toString();
}

type TokenType = 'NUMBER' | 'OPERATOR' | 'UNARY_MINUS' | 'PERCENT' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 3,
  '~': 4,
};

const RIGHT_ASSOCIATIVE: Record<string, boolean> = {
  '~': true,
};

export function tokenize(raw: string): Token[] {
  // Normalize display symbols
  let expr = raw.replace(/×/g, '*').replace(/÷/g, '/');

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numbers: digits and decimal point
    if (/\d/.test(ch) || (ch === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let numStr = '';
      let hasDot = false;
      while (i < expr.length) {
        const c = expr[i];
        if (/\d/.test(c)) {
          numStr += c;
          i++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          numStr += c;
          i++;
        } else {
          break;
        }
      }

      // Implicit multiplication before number if previous was RPAREN or PERCENT
      if (tokens.length > 0) {
        const prev = tokens[tokens.length - 1];
        if (prev.type === 'RPAREN' || prev.type === 'PERCENT') {
          tokens.push({ type: 'OPERATOR', value: '*' });
        }
      }

      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    if (ch === '(') {
      // Implicit multiplication before LPAREN if previous was NUMBER, RPAREN, or PERCENT
      if (tokens.length > 0) {
        const prev = tokens[tokens.length - 1];
        if (prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'PERCENT') {
          tokens.push({ type: 'OPERATOR', value: '*' });
        }
      }
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (ch === '%') {
      tokens.push({ type: 'PERCENT', value: '%' });
      i++;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      // Check for unary minus
      if (ch === '-') {
        const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
        if (!prev || prev.type === 'OPERATOR' || prev.type === 'LPAREN' || prev.type === 'UNARY_MINUS') {
          tokens.push({ type: 'UNARY_MINUS', value: '~' });
          i++;
          continue;
        }
      }

      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }

    // Ignore unrecognized character
    i++;
  }

  return tokens;
}

export function shuntingYard(tokens: Token[]): Token[] {
  const outputQueue: Token[] = [];
  const operatorStack: Token[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      outputQueue.push(token);
    } else if (token.type === 'PERCENT') {
      outputQueue.push(token);
    } else if (token.type === 'UNARY_MINUS') {
      operatorStack.push(token);
    } else if (token.type === 'OPERATOR') {
      const o1 = token.value;
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (top.type === 'LPAREN') break;

        const o2 = top.value;
        const p1 = PRECEDENCE[o1] || 0;
        const p2 = PRECEDENCE[o2] || 0;

        if ((!RIGHT_ASSOCIATIVE[o1] && p1 <= p2) || (RIGHT_ASSOCIATIVE[o1] && p1 < p2)) {
          outputQueue.push(operatorStack.pop()!);
        } else {
          break;
        }
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      let foundLparen = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === 'LPAREN') {
          foundLparen = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundLparen) {
        throw new Error('Mismatched parentheses');
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === 'LPAREN' || top.type === 'RPAREN') {
      throw new Error('Mismatched parentheses');
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

export function evaluateRPN(rpn: Token[]): number {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.type === 'NUMBER') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'UNARY_MINUS') {
      if (stack.length < 1) throw new Error('Invalid unary minus syntax');
      const val = stack.pop()!;
      stack.push(-val);
    } else if (token.type === 'PERCENT') {
      if (stack.length < 1) throw new Error('Invalid percentage syntax');
      const val = stack.pop()!;
      stack.push(val / 100);
    } else if (token.type === 'OPERATOR') {
      if (stack.length < 2) throw new Error('Invalid expression syntax');
      const b = stack.pop()!;
      const a = stack.pop()!;

      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
        default:
          throw new Error(`Unknown operator: ${token.value}`);
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }

  return stack[0];
}

export interface EvalResult {
  success: boolean;
  result: string;
  numericValue?: number;
  error?: string;
}

export function evaluateExpression(expression: string, isLivePreview: boolean = false): EvalResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { success: false, result: '' };
  }

  // If live preview and ends with operator or unclosed paren, don't show error
  if (isLivePreview) {
    const lastChar = trimmed[trimmed.length - 1];
    if (['+', '-', '*', '/', '×', '÷', '(', '.'].includes(lastChar)) {
      return { success: false, result: '' };
    }
  }

  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) {
      return { success: false, result: '' };
    }

    // Auto-close missing parentheses for live preview if needed
    if (isLivePreview) {
      let openParenCount = 0;
      for (const t of tokens) {
        if (t.type === 'LPAREN') openParenCount++;
        if (t.type === 'RPAREN') openParenCount--;
      }
      if (openParenCount > 0) {
        for (let k = 0; k < openParenCount; k++) {
          tokens.push({ type: 'RPAREN', value: ')' });
        }
      }
    }

    const rpn = shuntingYard(tokens);
    const num = evaluateRPN(rpn);
    const formatted = formatPrecision(num);

    return {
      success: formatted !== 'Error',
      result: formatted,
      numericValue: num,
    };
  } catch (err: any) {
    if (isLivePreview) {
      return { success: false, result: '' };
    }
    const msg = err?.message === 'Division by zero' ? 'Деление на ноль' : 'Ошибка';
    return {
      success: false,
      result: msg,
      error: err?.message || 'Syntax error',
    };
  }
}
