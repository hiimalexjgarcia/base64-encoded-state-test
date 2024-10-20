/* eslint-env browser */

import { v4 as uuidv4 } from 'uuid'
import AppState from './app_state'
import Note from './components/note'
import './modernizr'
import 'bootstrap/dist/css/bootstrap.css'

import './index.css'

const App = AppState()
App.pubsub.subscribe('appStateChanged', (msg, data) => {
  window.history.replaceState(
    null,
    null,
    document.location.pathname + '#/' + Buffer.from(JSON.stringify(data.obj)).toString('base64')
  )
})
App.pubsub.subscribe('notesStateChanged', (msg, notes) => {
  $('#notesDisplayCount').innerHTML = `${notes.length} notes`
})
App.pubsub.subscribe('notesCreated', (msg, notes) => {
  updateNotesContainer(notes)
})
App.pubsub.subscribe('notesDeleted', (msg, notes) => {
  notes.forEach((note) => {
    const throwaway = $('#notes').querySelector(`[data-id="${note.id}"]`)
    throwaway.parentNode.removeChild(throwaway)
  })
})


// DOM helper functions
function $ (selector) {
  return document.querySelector(selector)
}
function updateNotesContainer (notes) {
  notes.forEach((note) => {
    const el = Note(note, () => {
      App.notes.remove(note)
    })
    $('#notes').appendChild(el)
  })
}


// Set up notes toolbar
$('#notesInputSearch').addEventListener('search', (e) => {
  const q = e.target.value
  const r = q ? App.notes.search(e.target.value).map((n) => n.item) : App.notes.getAll()
  $('#notes').innerHTML = ''
  updateNotesContainer(r)
}, false)
$('#addNoteForm').addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(e.target)
  App.notes.add({
    id: uuidv4(),
    title: data.get('note'),
    body: data.get('detail')
  })
  e.target.reset()
}, false)


// Initalize App state
window.addEventListener('hashchange', () => {
  try {
    App.state.setEncoded(window.location.hash.substring(2))
  } catch (e) {
    if (window.location.hash.substring(2)) {
      console.error(e)
      alert(e + '\n\nResetting app...')
    }
    App.state.setEncoded('eyJub3RlcyI6W119') // 'eyJub3RlcyI6W119' base64 for { notes: [] }
  }
}, false)
// Initial render
window.dispatchEvent(new HashChangeEvent('hashchange'))
