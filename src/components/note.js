const Note = (note, deleteCallback) => {
  const el = document.createElement('div');
  el.className = "note"
  el.dataset.id = note.id
  el.innerHTML = `
    <button type="button" aria-label="Delete note" class="note-delete">
      <span aria-hidden style="pointer-events: none">×</span>
      <span class="screen-reader">Delete note</span>
    </button>
    <details>
      <summary>
        <span class="note-title">${note.title}</span>
      </summary>
      <p class="note-body">${note.body}</p>
    </details>
  `
  el.querySelector('.note-delete').addEventListener("click", deleteCallback)
  return el;
}

export default Note;
