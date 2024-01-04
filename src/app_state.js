import PubSub from 'pubsub-js'
import Fuse from 'fuse.js'

const AppState = () => {
  const state = new Proxy({
    notes: []
  }, {
    set: (obj, prop, value) => {
      try {
        const oldobj = Object.assign({}, obj)
        obj[prop] = value
        PubSub.publish('appStateChanged', { prop, obj })
        if (prop === 'notes') {
          PubSub.publish('notesStateChanged', value)
          const notesDeleted = oldobj.notes.filter(note => !obj.notes.includes(note))
          notesDeleted.length && PubSub.publish('notesDeleted', notesDeleted)
          const notesCreated = obj.notes.filter(note => !oldobj.notes.includes(note))
          notesCreated.length && PubSub.publish('notesCreated', notesCreated)
        }
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    }
  })

  return {
    state: {
      setEncoded: s => Object.assign(state, JSON.parse(Buffer.from(s, 'base64').toString('utf8')))
    },
    notes: {
      getAll: () => [...state.notes],
      add: n => { state.notes = [...state.notes, n] },
      remove: n => { state.notes = state.notes.filter((node) => node !== n) },
      search: q => {
        const fuse = new Fuse(state.notes, {
          useExtendedSearch: true,
          keys: ['title', 'body']
        })
        return fuse.search(q)
      }
    },
    pubsub: {
      subscribe: PubSub.subscribe
    }
  }
}

export default AppState
