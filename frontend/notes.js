let notes = JSON.parse(localStorage.getItem("notes")) || [];
let editId = null;

const container = document.getElementById("notesContainer");

/* ---------- RENDER ---------- */
function renderNotes() {
  if (!container) return;
  container.innerHTML = "";

  const sorted = [
    ...notes.filter(n => n.pinned),
    ...notes.filter(n => !n.pinned)
  ];

  sorted.forEach(note => {
    const div = document.createElement("div");
    div.className = `note-card note-${note.color || "blue"}`;

    div.innerHTML = `
      <div class="note-top">
        <span class="note-tag">${note.tag || "General"}</span>
        <button class="pin-btn" onclick="togglePin(${note.id})">
          ${note.pinned ? "📌" : "📍"}
        </button>
      </div>

      <div class="note-text">${note.text}</div>

      <div class="note-footer">
        <span class="note-date">${note.date}</span>
        <div class="note-actions">
          <button onclick="openEdit(${note.id})">✏️</button>
          <button onclick="deleteNote(${note.id})">🗑</button>
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ---------- ADD ---------- */
function saveNote() {
  const text = document.getElementById("notes-text")?.value.trim();
  const tag = document.getElementById("note-tag")?.value || "General";
  const color = document.getElementById("note-color")?.value || "blue";

  if (!text) return alert("Write something first");

  notes.unshift({
    id: Date.now(),
    text,
    tag,
    color,
    pinned: false,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("notes", JSON.stringify(notes));
  document.getElementById("notes-text").value = "";
  toggleNotes?.();
  renderNotes();
}

/* ---------- DELETE ---------- */
function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
}

/* ---------- PIN ---------- */
function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
}

/* ---------- EDIT ---------- */
function openEdit(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  editId = id;
  document.getElementById("editText").value = note.text;
  document.getElementById("editModal").style.display = "flex";
}

function saveEdit() {
  const note = notes.find(n => n.id === editId);
  if (!note) return;

  note.text = document.getElementById("editText").value.trim();
  localStorage.setItem("notes", JSON.stringify(notes));
  closeEdit();
  renderNotes();
}

function closeEdit() {
  document.getElementById("editModal").style.display = "none";
}

renderNotes();
