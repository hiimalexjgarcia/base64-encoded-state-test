export default function AppState() {

  const state = new Proxy({
    count: 0,
    notes: [],
  }, {
    set: (obj, prop, value) => {
      obj[prop] = value;
      window.location.hash = '#/' + btoa(JSON.stringify(state));
      return true;
    }
  });

  return {
    state: {
      getEncoded: () => btoa(JSON.stringify(state)),
      setEncoded: s => Object.assign(state, JSON.parse(atob(s))),
    },
    counter: {
      increment: () => state.count += 1,
      decrement: () => state.count -= 1,
      get: () => state.count
    },
    notes: {
      getAll: () => [...state.notes],
      add: n => {
        state.notes = [...state.notes, n];
      },
      remove: n => {
        state.notes = state.notes.filter((node) => node !== n);
      }
    }
  };
}
