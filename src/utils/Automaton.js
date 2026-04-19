export default class Automaton {
  constructor() {
    this.states = new Set();
    this.alphabet = new Set();
    this.transitions = {};
    this.startState = null;
    this.acceptStates = new Set();
  }
}
