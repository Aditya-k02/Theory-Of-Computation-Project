export default function formatGraph(automaton) {
  const elements = [];
  const edgeLabels = new Map();

  for (const state of automaton.states) {
    const classes = [
      state === automaton.startState ? 'start' : '',
      automaton.acceptStates.has(state) ? 'accept' : '',
    ]
      .filter(Boolean)
      .join(' ');

    elements.push({
      data: {
        id: state,
        label: state,
      },
      classes,
    });
  }

  for (const [source, transitionsBySymbol] of Object.entries(automaton.transitions)) {
    for (const [symbol, targets] of Object.entries(transitionsBySymbol)) {
      for (const target of targets) {
        const key = `${source}=>${target}`;
        if (!edgeLabels.has(key)) {
          edgeLabels.set(key, new Set());
        }
        edgeLabels.get(key).add(symbol);
      }
    }
  }

  for (const [key, labels] of edgeLabels.entries()) {
    const [source, target] = key.split('=>');
    elements.push({
      data: {
        id: `${source}-${target}-${[...labels].sort().join('_')}`,
        source,
        target,
        label: [...labels].sort().join(', '),
      },
    });
  }

  return elements;
}
