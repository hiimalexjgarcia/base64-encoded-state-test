import { v4 as uuidv4 } from 'uuid';

import AppState from './app_state';

const App = AppState();

// Set up counter
  const counterDisplay = document.getElementById('counterDisplay');
  const counterButtonDecrement = document.getElementById('counterButtonDecrement');
  const counterButtonIncrement = document.getElementById('counterButtonIncrement');

  counterButtonIncrement.addEventListener('click', () => App.counter.increment(), false);
  counterButtonDecrement.addEventListener('click', () => App.counter.decrement(), false);

  window.addEventListener('hashchange', () => {
    counterDisplay.innerHTML = App.counter.get();
  }, false);


// Set up notes
  const ipsum = new LoremIpsum();
  const notesContainer = document.getElementById('notesContainer');
  const notesButtonAdd = document.getElementById('notesButtonAdd');
  const notesDisplayCount = document.getElementById('notesDisplayCount');
  const noteTemplate = document.getElementById('noteTemplate').content;

  notesButtonAdd.addEventListener('click', () => {
    App.notes.add({
      id: uuidv4(),
      title: ipsum.sentence(),
      body: Math.floor(Math.random() * 2) ? ipsum.paragraph() : undefined
    });
  }, false);

  window.addEventListener('hashchange', () => {
    const notesEl = document.createElement('div');

    App.notes.getAll().forEach((note) => {
      const el = noteTemplate.firstElementChild.cloneNode(true);
      const button = el.querySelector('button');
      const cardTitle = el.querySelector('.card-title');
      const cardText = el.querySelector('.card-text');

      el.dataset.id = note.id;
      cardTitle.innerHTML = note.title;
      note.body ? cardText.innerHTML = note.body : null;

      button.addEventListener('click', (e) => {
        const id = e.target.parentNode.parentNode.parentNode.dataset.id;
        const note = App.notes.getAll().find((note) => note.id === id);
        App.notes.remove(note);
      });

      notesEl.appendChild(el);
    });

    notesContainer.replaceChildren(notesEl);

    notesDisplayCount.innerHTML = `${App.notes.getAll().length} notes`;
  }, false);


// Set up Copy URL button
  const buttonCopyURL = document.getElementById('buttonCopyURL');

  buttonCopyURL.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href);
  }, false);


// Initalize App state
  try {
    App.state.setEncoded(window.location.hash.substring(2));
    window.dispatchEvent(new HashChangeEvent('hashchange')); // to trigger initial render
  } catch (e) {
    console.error(e);
    App.state.setEncoded('eyJjb3VudCI6MCwibm90ZXMiOltdfQ=='); // 'eyJjb3VudCI6MCwibm90ZXMiOltdfQ==' base64 for { count: 0, notes: [] }
  }
