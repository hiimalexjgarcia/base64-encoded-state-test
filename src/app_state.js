import PubSub from 'pubsub-js'

export default function AppState () {
  const state = new Proxy({
    count: 0,
    notes: []
  }, {
    set: (obj, prop, value) => {
      obj[prop] = value
      PubSub.publish('updateState', { prop, obj })
      return true
    }
  })

  return {
    state: {
      setEncoded: s => Object.assign(state, JSON.parse(Buffer.from(s, 'base64').toString('utf8')))
    },
    notes: {
      getAll: () => [...state.notes],
      add: n => {
        state.notes = [...state.notes, n]
      },
      remove: n => {
        state.notes = state.notes.filter((node) => node !== n)
      }
    },
    pubsub: {
      subscribe: (f) => { return PubSub.subscribe('updateState', f) }
    }
  }
}
