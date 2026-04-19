import Automaton from './Automaton.js';

function sortedKey(states) {
  return [...states].sort().join(',');
}

export function epsilonClosure(states, nfa) {
  const closure = new Set(states);
  const stack = [...states];

  while (stack.length) {
    const state = stack.pop();
    const epsilonTargets = nfa.transitions[state]?.epsilon || [];
    for (const target of epsilonTargets) {
      if (!closure.has(target)) {
        closure.add(target);
        stack.push(target);
      }
    }
  }

  return closure;
}

function move(states, symbol, nfa) {
  const reachable = new Set();
  for (const state of states) {
    const targets = nfa.transitions[state]?.[symbol] || [];
    for (const target of targets) {
      reachable.add(target);
    }
  }
  return reachable;
}

function addTransition(machine, from, symbol, to) {
  if (!machine.transitions[from]) {
    machine.transitions[from] = {};
  }
  machine.transitions[from][symbol] = [to];
}

export default function subsetConstruct(nfa) {
  if (!nfa.startState) {
    throw new Error('NFA is missing a start state.');
  }

  const dfa = new Automaton();
  const alphabet = [...nfa.alphabet];
  const startClosure = epsilonClosure(new Set([nfa.startState]), nfa);
  const stateMap = new Map();
  const queue = [];
  let dfaStateCounter = 0;

  const createDfaState = (closure) => {
    const key = sortedKey(closure);
    if (stateMap.has(key)) {
      return stateMap.get(key);
    }

    const id = `D${dfaStateCounter}`;
    dfaStateCounter += 1;
    stateMap.set(key, { id, closure });
    dfa.states.add(id);
    dfa.transitions[id] = {};
    if ([...closure].some((state) => nfa.acceptStates.has(state))) {
      dfa.acceptStates.add(id);
    }
    queue.push({ id, closure });
    return stateMap.get(key);
  };

  const startEntry = createDfaState(startClosure);
  dfa.startState = startEntry.id;
  dfa.alphabet = new Set(alphabet);

  while (queue.length) {
    const current = queue.shift();

    for (const symbol of alphabet) {
      const reachable = move(current.closure, symbol, nfa);
      if (!reachable.size) {
        continue;
      }

      const closure = epsilonClosure(reachable, nfa);
      const nextEntry = createDfaState(closure);
      addTransition(dfa, current.id, symbol, nextEntry.id);
    }
  }

  return dfa;
}
