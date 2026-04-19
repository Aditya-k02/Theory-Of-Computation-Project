import Automaton from './Automaton.js';

let stateCounter = 0;

function resetCounter() {
  stateCounter = 0;
}

function createState() {
  const state = `q${stateCounter}`;
  stateCounter += 1;
  return state;
}

function ensureState(machine, state) {
  machine.states.add(state);
  if (!machine.transitions[state]) {
    machine.transitions[state] = {};
  }
}

function addTransition(machine, from, symbol, to) {
  ensureState(machine, from);
  ensureState(machine, to);
  if (!machine.transitions[from][symbol]) {
    machine.transitions[from][symbol] = [];
  }
  machine.transitions[from][symbol].push(to);
  if (symbol !== 'epsilon') {
    machine.alphabet.add(symbol);
  }
}

function mergeInto(target, source) {
  for (const state of source.states) {
    ensureState(target, state);
  }

  for (const [from, transitionsBySymbol] of Object.entries(source.transitions)) {
    for (const [symbol, targets] of Object.entries(transitionsBySymbol)) {
      for (const targetState of targets) {
        addTransition(target, from, symbol, targetState);
      }
    }
  }
}

function symbolFragment(symbol) {
  const start = createState();
  const accept = createState();
  const machine = new Automaton();

  addTransition(machine, start, symbol, accept);
  machine.startState = start;
  machine.acceptStates.add(accept);

  return { start, accept, machine };
}

function concatenate(left, right) {
  const machine = new Automaton();
  mergeInto(machine, left.machine);
  mergeInto(machine, right.machine);
  addTransition(machine, left.accept, 'epsilon', right.start);
  machine.startState = left.start;
  machine.acceptStates.add(right.accept);

  return { start: left.start, accept: right.accept, machine };
}

function union(left, right) {
  const start = createState();
  const accept = createState();
  const machine = new Automaton();

  mergeInto(machine, left.machine);
  mergeInto(machine, right.machine);
  addTransition(machine, start, 'epsilon', left.start);
  addTransition(machine, start, 'epsilon', right.start);
  addTransition(machine, left.accept, 'epsilon', accept);
  addTransition(machine, right.accept, 'epsilon', accept);
  machine.startState = start;
  machine.acceptStates.add(accept);

  return { start, accept, machine };
}

function kleeneStar(fragment) {
  const start = createState();
  const accept = createState();
  const machine = new Automaton();

  mergeInto(machine, fragment.machine);
  addTransition(machine, start, 'epsilon', fragment.start);
  addTransition(machine, start, 'epsilon', accept);
  addTransition(machine, fragment.accept, 'epsilon', fragment.start);
  addTransition(machine, fragment.accept, 'epsilon', accept);
  machine.startState = start;
  machine.acceptStates.add(accept);

  return { start, accept, machine };
}

export default function thompsonConstruct(postfix) {
  if (!postfix) {
    throw new Error('Postfix regex is empty.');
  }

  resetCounter();
  const stack = [];

  for (const token of postfix) {
    if (/^[a-zA-Z0-9]$/.test(token)) {
      stack.push(symbolFragment(token));
    } else if (token === '.') {
      if (stack.length < 2) {
        throw new Error('Invalid regex: concatenation is missing an operand.');
      }
      const right = stack.pop();
      const left = stack.pop();
      stack.push(concatenate(left, right));
    } else if (token === '|') {
      if (stack.length < 2) {
        throw new Error('Invalid regex: union is missing an operand.');
      }
      const right = stack.pop();
      const left = stack.pop();
      stack.push(union(left, right));
    } else if (token === '*') {
      if (!stack.length) {
        throw new Error('Invalid regex: Kleene star is missing an operand.');
      }
      stack.push(kleeneStar(stack.pop()));
    } else {
      throw new Error(`Unsupported postfix token "${token}".`);
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid regex: unable to finish Thompson construction.');
  }

  return stack.pop().machine;
}
