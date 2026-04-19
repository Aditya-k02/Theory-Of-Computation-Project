import { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { parseRegexToPostfix } from './utils/parser.js';
import thompsonConstruct from './utils/thompson.js';
import subsetConstruct from './utils/subset.js';
import hopcroftMinimize from './utils/hopcroft.js';
import formatGraph from './utils/formatGraph.js';

cytoscape.use(dagre);

const graphStylesheet = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'background-color': '#0f172a',
      color: '#0f172a',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      'border-width': 2,
      'border-color': '#cbd5e1',
      'text-margin-y': 32,
      width: 34,
      height: 34,
    },
  },
  {
    selector: 'node.accept',
    style: {
      'background-color': '#0f766e',
      'border-width': 4,
      'border-color': '#134e4a',
    },
  },
  {
    selector: 'node.start',
    style: {
      'background-color': '#1d4ed8',
    },
  },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'line-color': '#64748b',
      'target-arrow-color': '#64748b',
      'arrow-scale': 1.1,
      'font-size': '11px',
      color: '#334155',
      'text-background-opacity': 1,
      'text-background-color': '#f8fafc',
      'text-background-padding': '2px',
    },
  },
];

const layout = {
  name: 'dagre',
  rankDir: 'LR',
  nodeSep: 50,
  rankSep: 80,
  fit: true,
  animate: false,
  padding: 40,
};

function GraphPanel({ title, elements }) {
  const cyRef = useRef(null);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !elements.length) {
      return;
    }

    const runLayout = () => {
      cy.layout(layout).run();
      cy.fit(cy.elements(), 40);
      cy.center(cy.elements());

      const currentZoom = cy.zoom();
      if (currentZoom > 1.2) {
        cy.zoom(1.2);
        cy.center(cy.elements());
      }
    };

    // Wait one paint so Cytoscape has the final container size before fitting.
    requestAnimationFrame(runLayout);
  }, [elements]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <CytoscapeComponent
          elements={elements}
          layout={layout}
          stylesheet={graphStylesheet}
          cy={(cy) => {
            cyRef.current = cy;
          }}
          minZoom={0.35}
          maxZoom={1.5}
          wheelSensitivity={0.2}
          autoungrabify={false}
          autounselectify={false}
          style={{ width: '100%', height: '400px' }}
        />
      </div>
    </section>
  );
}

export default function App() {
  const [regex, setRegex] = useState('(a|b)*abb');
  const [error, setError] = useState('');
  const [graphs, setGraphs] = useState({
    nfa: [],
    dfa: [],
    minDfa: [],
  });

  const handleVisualize = () => {
    try {
      setError('');
      const postfix = parseRegexToPostfix(regex);
      const nfa = thompsonConstruct(postfix);
      const dfa = subsetConstruct(nfa);
      const minDfa = hopcroftMinimize(dfa);

      setGraphs({
        nfa: formatGraph(nfa),
        dfa: formatGraph(dfa),
        minDfa: formatGraph(minDfa),
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to process the regex.';
      setError(message);
      window.alert(message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Theory of Computation</p>
          <h1 className="mt-2 text-3xl font-bold">Regular Expression to Minimized DFA Visualizer</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Enter a regex using symbols, parentheses, union <code>|</code>, concatenation, and Kleene
            star <code>*</code>. The app will build the NFA, DFA, and minimized DFA.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={regex}
              onChange={(event) => setRegex(event.target.value)}
              placeholder="Example: (a|b)*abb"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleVisualize}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Visualize
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </header>

        <GraphPanel title="1. NFA" elements={graphs.nfa} />
        <GraphPanel title="2. DFA" elements={graphs.dfa} />
        <GraphPanel title="3. Minimized DFA" elements={graphs.minDfa} />
      </div>
    </main>
  );
}
