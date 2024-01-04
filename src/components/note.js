import van from "vanjs-core/debug"

const {div, button, span, details, summary, p} = van.tags

const Note = () => div({class: "note"},
  button({type: "button", "aria-label": "Delete note", class: "note-delete"},
    span({"aria-hidden": "true", style: "pointer-events: none"}, "×"),
    span({class: "screen-reader"}, "Delete note"),
  ),
  details(
    summary(
	span({class: "note-title"})
    ),
    p({class: "note-text"})
  )
)

export default Note;
