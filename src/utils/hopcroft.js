import Automaton from './Automaton.js';

function setKey(set) {
  return [...set].sort().join(',');
}

function intersection(left, right) {
  const result = new Set();
  for (const value of left) {
    if (right.has(value)) {
      result.add(value);
    }
  }
  return result;
}

function difference(left, right) {
  const result = new Set();
  for (const value of left) {
    if (!right.has(value)) {
      result.add(value);
    }
  }
  return result;
}

function getTarget(dfa, state, symbol) {
  return dfa.transitions[state]?.[symbol]?.[0] ?? null;
}

function buildStateToPartition(partitions) {
  const mapping = new Map();
  partitions.forEach((partition, index) => {
    for (const state of partition) {
      mapping.set(state, index);
    }
  });
  return mapping;
}

export default function hopcroftMinimize(dfa) {
  if (!dfa.startState) {
    throw new Error('DFA is missing a start state.');
  }

  const accepting = new Set(dfa.acceptStates);
  const nonAccepting = new Set([...dfa.states].filter((state) => !accepting.has(state)));
  let partitions = [];

  if (accepting.size) {
    partitions.push(accepting);
  }
  if (nonAccepting.size) {
    partitions.push(nonAccepting);
  }

  if (!partitions.length) {
    return new Automaton();
  }

  const worklist = [...partitions];

  while (worklist.length) {
    const splitter = worklist.shift();

    for (const symbol of dfa.alphabet) {
      const predecessors = new Set();
      for (const state of dfa.states) {
        if (splitter.has(getTarget(dfa, state, symbol))) {
          predecessors.add(state);
        }
      }

      const nextPartitions = [];
      for (const group of partitions) {
        const groupIntersection = intersection(group, predecessors);
        const groupDifference = difference(group, predecessors);

        if (!groupIntersection.size || !groupDifference.size) {
          nextPartitions.push(group);
          continue;
        }

        nextPartitions.push(groupIntersection, groupDifference);

        const existingIndex = worklist.findIndex((item) => setKey(item) === setKey(group));
        if (existingIndex >= 0) {
          worklist.splice(existingIndex, 1, groupIntersection, groupDifference);
        } else if (groupIntersection.size <= groupDifference.size) {
          worklist.push(groupIntersection);
        } else {
          worklist.push(groupDifference);
        }
      }

      partitions = nextPartitions;
    }
  }

  const minDfa = new Automaton();
  minDfa.alphabet = new Set(dfa.alphabet);
  const stateToPartition = buildStateToPartition(partitions);

  partitions.forEach((partition, index) => {
    const stateId = `M${index}`;
    minDfa.states.add(stateId);
    minDfa.transitions[stateId] = {};

    for (const originalState of partition) {
      if (dfa.acceptStates.has(originalState)) {
        minDfa.acceptStates.add(stateId);
      }
      if (originalState === dfa.startState) {
        minDfa.startState = stateId;
      }
    }
  });

  partitions.forEach((partition, index) => {
    const representative = [...partition][0];
    const fromState = `M${index}`;

    for (const symbol of dfa.alphabet) {
      const target = getTarget(dfa, representative, symbol);
      if (!target) {
        continue;
      }

      const targetPartitionIndex = stateToPartition.get(target);
      if (targetPartitionIndex === undefined) {
        continue;
      }

      minDfa.transitions[fromState][symbol] = [`M${targetPartitionIndex}`];
    }
  });

  return minDfa;
}
