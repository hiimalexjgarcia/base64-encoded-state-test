/* eslint-env browser */

import { v4 as uuidv4 } from 'uuid'
import { LoremIpsum } from 'lorem-ipsum'

import './index.css'
import AppState from './app_state'

const App = AppState()

// Set up notes
const notesContainer = document.getElementById('notesContainer')
const noteTemplate = document.getElementById('noteTemplate').content

document.getElementById('notesButtonAdd').addEventListener('click', () => {
  const ipsum = new LoremIpsum()
  App.notes.add({
    id: uuidv4(),
    title: ipsum.generateSentences(1),
    body: Math.floor(Math.random() * 2) ? ipsum.generateParagraphs(1) : undefined
  })
}, false)

App.pubsub.subscribe('notesStateChanged', (msg, notes) => {
  document.getElementById('notesDisplayCount').innerHTML = `${notes.length} notes`
})

App.pubsub.subscribe('appStateChanged', (msg, data) => {
  window.history.replaceState(null, null, document.location.pathname + '#/' + Buffer.from(JSON.stringify(data.obj)).toString('base64'))
})

App.pubsub.subscribe('notesCreated', (msg, notes) => {
  notes.forEach((note) => {
    const el = noteTemplate.firstElementChild.cloneNode(true)
    el.dataset.id = note.id
    el.querySelector('.card-title').innerHTML = note.title
    el.querySelector('.card-text').innerHTML = note.body ? note.body : null
    el.querySelector('button').addEventListener('click', () => {
      const id = el.dataset.id
      const note = notes.find((note) => note.id === id)
      App.notes.remove(note)
    })
    notesContainer.appendChild(el)
  })
})

App.pubsub.subscribe('notesDeleted', (msg, notes) => {
  notes.forEach((note) => {
    const throwaway = notesContainer.querySelector(`[data-id="${note.id}"]`)
    throwaway.onanimationend = (e) => {
      if (e.target.classList.contains('fade-out')) {
        throwaway.parentNode.removeChild(throwaway);
      }
    };
    throwaway.classList.add('fade-out')
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
