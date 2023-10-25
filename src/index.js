/* eslint-env browser */

import { v4 as uuidv4 } from 'uuid'
import { LoremIpsum } from 'lorem-ipsum'
import AppState from './app_state'
import './modernizr'
import './index.css'

const App = AppState()

// DOM helper functions
function $ (selector) {
  return document.querySelector(selector)
}

// Set up notes toolbar
$('#notesButtonAdd').addEventListener('click', () => {
  const ipsum = new LoremIpsum()
  App.notes.add({
    id: uuidv4(),
    title: ipsum.generateSentences(1),
    body: Math.floor(Math.random() * 2) ? ipsum.generateParagraphs(1) : undefined
  })
}, false)

$('#notesInputSearch').addEventListener('search', (e) => {
  const q = e.target.value
  const r = q ? App.notes.search(e.target.value).map((n) => n.item) : App.notes.getAll()
  $('#notesContainer').innerHTML = ''
  updateNotesContainer(r)
}, false)

// Register notes UI updates

App.pubsub.subscribe('appStateChanged', (msg, data) => {
  window.history.replaceState(null, null, document.location.pathname + '#/' + Buffer.from(JSON.stringify(data.obj)).toString('base64'))
})

App.pubsub.subscribe('notesStateChanged', (msg, notes) => {
  $('#notesDisplayCount').innerHTML = `${notes.length} notes`
})

App.pubsub.subscribe('notesCreated', (msg, notes) => {
  updateNotesContainer(notes)
})

App.pubsub.subscribe('notesDeleted', (msg, notes) => {
  notes.forEach((note) => {
    const throwaway = $('#notesContainer').querySelector(`[data-id="${note.id}"]`)
    throwaway.parentNode.removeChild(throwaway)
  })
})

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

// Render notes
function updateNotesContainer (notes) {
  notes.forEach((note) => {
    const el = $('#noteTemplate').content.firstElementChild.cloneNode(true)
    el.dataset.id = note.id
    el.querySelector('.card-title').innerHTML = note.title
    el.querySelector('.card-text').innerHTML = note.body ? note.body : null
    el.querySelector('.note-delete').addEventListener('click', () => {
      const id = el.dataset.id
      const note = notes.find((note) => note.id === id)
      App.notes.remove(note)
    })
    $('#notesContainer').appendChild(el)
  })
}
