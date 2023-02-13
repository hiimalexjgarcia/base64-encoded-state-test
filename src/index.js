/* eslint-env browser */

import { v4 as uuidv4 } from 'uuid'
import { LoremIpsum } from 'lorem-ipsum'

import './index.css'
import AppState from './app_state'

const App = AppState()

// Set up counter
const counterDisplay = document.getElementById('counterDisplay')
const counterButtonDecrement = document.getElementById('counterButtonDecrement')
const counterButtonIncrement = document.getElementById('counterButtonIncrement')

counterButtonIncrement.addEventListener('click', () => App.counter.increment(), false)
counterButtonDecrement.addEventListener('click', () => App.counter.decrement(), false)

App.pubsub.subscribe((msg, data) => {
  if (data.prop === 'count') {
    counterDisplay.innerHTML = data.obj.count
  }
})

// Set up notes
const ipsum = new LoremIpsum()
const notesContainer = document.getElementById('notesContainer')
const notesButtonAdd = document.getElementById('notesButtonAdd')
const notesDisplayCount = document.getElementById('notesDisplayCount')
const noteTemplate = document.getElementById('noteTemplate').content

notesButtonAdd.addEventListener('click', () => {
  App.notes.add({
    id: uuidv4(),
    title: ipsum.generateSentences(1),
    body: Math.floor(Math.random() * 2) ? ipsum.generateParagraphs(1) : undefined
  })
}, false)

App.pubsub.subscribe((msg, data) => {
  if (data.prop === 'notes') {
    const notesEl = document.createElement('div')

    data.obj.notes.forEach((note) => {
      const el = noteTemplate.firstElementChild.cloneNode(true)
      const button = el.querySelector('button')
      const cardTitle = el.querySelector('.card-title')
      const cardText = el.querySelector('.card-text')

      el.dataset.id = note.id
      cardTitle.innerHTML = note.title
      if (note.body) cardText.innerHTML = note.body

      button.addEventListener('click', (e) => {
        const id = e.target.parentNode.parentNode.parentNode.dataset.id
        const note = data.obj.notes.find((note) => note.id === id)
        App.notes.remove(note)
      })

      notesEl.appendChild(el)
    })

    notesContainer.replaceChildren(notesEl)

    notesDisplayCount.innerHTML = `${App.notes.getAll().length} notes`
  }
})

// Set up Copy URL button
const buttonCopyURL = document.getElementById('buttonCopyURL')

buttonCopyURL.addEventListener('click', () => {
  navigator.clipboard.writeText(location.href)
}, false)

// Initalize App state
window.addEventListener('hashchange', () => {
  try {
    App.state.setEncoded(window.location.hash.substring(2))
  } catch (e) {
    console.error(e)
    App.state.setEncoded('eyJjb3VudCI6MCwibm90ZXMiOltdfQ==') // 'eyJjb3VudCI6MCwibm90ZXMiOltdfQ==' base64 for { count: 0, notes: [] }
  }
}, false)

// Initial render
window.dispatchEvent(new HashChangeEvent('hashchange'))
