const OPERATORS = new Set(['|', '.', '*']);

function isSymbol(char) {
  return /^[a-zA-Z0-9]$/.test(char);
}

function needsConcat(current, next) {
  const currentIsToken = isSymbol(current) || current === ')' || current === '*';
  const nextIsToken = isSymbol(next) || next === '(';
  return currentIsToken && nextIsToken;
}

export function addConcatOperators(regex) {
  if (!regex || typeof regex !== 'string') {
    throw new Error('Please enter a regular expression.');
  }

  const trimmed = regex.replace(/\s+/g, '');
  if (!trimmed) {
    throw new Error('Please enter a regular expression.');
  }

  let result = '';
  for (let index = 0; index < trimmed.length; index += 1) {
    const current = trimmed[index];
    const next = trimmed[index + 1];

    if (!isSymbol(current) && !['(', ')', '|', '*'].includes(current)) {
      throw new Error(`Unsupported token "${current}" in regex.`);
    }

    if (current === '|' && (index === 0 || index === trimmed.length - 1)) {
      throw new Error('Union operator cannot appear at the edge of the regex.');
    }

    result += current;
    if (next && needsConcat(current, next)) {
      result += '.';
    }
  }

  return result;
}

export function toPostfix(regexWithConcat) {
  const precedence = { '|': 1, '.': 2, '*': 3 };
  const output = [];
  const stack = [];
  let balance = 0;
  let previous = null;

  for (const char of regexWithConcat) {
    if (isSymbol(char)) {
      output.push(char);
    } else if (char === '(') {
      stack.push(char);
      balance += 1;
    } else if (char === ')') {
      balance -= 1;
      if (balance < 0) {
        throw new Error('Unbalanced parentheses in regex.');
      }
      while (stack.length && stack[stack.length - 1] !== '(') {
        output.push(stack.pop());
      }
      if (!stack.length) {
        throw new Error('Unbalanced parentheses in regex.');
      }
      stack.pop();
    } else if (OPERATORS.has(char)) {
      if (char !== '*' && (!previous || (OPERATORS.has(previous) && previous !== '*') || previous === '(')) {
        throw new Error(`Operator "${char}" is in an invalid position.`);
      }
      while (
        stack.length &&
        stack[stack.length - 1] !== '(' &&
        precedence[stack[stack.length - 1]] >= precedence[char]
      ) {
        output.push(stack.pop());
      }
      stack.push(char);
    } else {
      throw new Error(`Unsupported token "${char}" in regex.`);
    }

    previous = char;
  }

  if (balance !== 0) {
    throw new Error('Unbalanced parentheses in regex.');
  }

  while (stack.length) {
    const top = stack.pop();
    if (top === '(') {
      throw new Error('Unbalanced parentheses in regex.');
    }
    output.push(top);
  }

  return output.join('');
}

export function parseRegexToPostfix(regex) {
  return toPostfix(addConcatOperators(regex));
}
