import { useState, useEffect, useRef } from "react";

const CATEGORIES = ["Personal", "Trabajo", "Ideas", "Estudio", "Salud", "Otro"];
const CAT_COLORS = {
  Personal: "#a78bfa", Trabajo: "#60a5fa", Ideas: "#34d399",
  Estudio: "#fbbf24", Salud: "#f87171", Otro: "#94a3b8"
};

const emptyNote = () => ({ id: Date.now(), title: "", content: "", category: "Personal", reminder: "", createdAt: new Date().toISOString() });

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatReminder(iso) {
  if (!iso) return null;
  const d = new Date(iso), now = new Date(), diff = d - now;
  if (diff < 0) return { label: "Vencido", color: "#f87171" };
  if (diff < 3600000) return { label: "¡Pronto!", color: "#fbbf24" };
  return { label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), color: "#34d399" };
}

// Minimal Markdown renderer
function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Code blocks
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre style="background:#0f172a;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px"><code>${c.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#0f172a;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="margin:16px 0 8px;font-size:15px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:20px 0 10px;font-size:18px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:24px 0 12px;font-size:22px">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #334155;margin:16px 0"/>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #6366f1;margin:8px 0;padding:4px 12px;color:#94a3b8">$1</blockquote>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:16px;height:16px;background:#6366f1;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">✓</span><span style="text-decoration:line-through;opacity:0.6">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:16px;height:16px;border:2px solid #475569;border-radius:4px;display:inline-block;flex-shrink:0"></span><span>$1</span></div>')
    // Unordered list
    .replace(/^[\*\-] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;list-style-type:decimal;padding-left:4px">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#818cf8;text-decoration:underline" target="_blank">$1</a>')
    // Paragraphs / line breaks
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/\n/g, '<br/>');

  // Wrap li in ul
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<br\/>)?)+/gs, m => `<ul style="margin:8px 0;padding-left:20px">${m.replace(/<br\/>/g, '')}</ul>`);
  return `<p style="margin:10px 0">${html}</p>`;
}

function MarkdownPreview({ content, style }) {
  return (
    <div
      style={{ ...style, lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [view, setView] = useState("list");
  const [current, setCurrent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todas");
  const [dark, setDark] = useState(true);
  const [saved, setSaved] = useState(false);
  const [mdMode, setMdMode] = useState("edit"); // edit | preview | split
  const [reminderAlert, setReminderAlert] = useState(null);
  const reminderInterval = useRef(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.readNotes().then(data => setNotes(data || []));
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.writeNotes(notes);
    }
  }, [notes]);

  useEffect(() => {
    reminderInterval.current = setInterval(() => {
      const now = new Date();
      notes.forEach(n => {
        if (!n.reminder) return;
        const diff = new Date(n.reminder) - now;
        if (diff > 0 && diff < 60000) {
          window.electronAPI?.notify({ title: '⏰ Recordatorio', body: n.title });
          setReminderAlert(n);
        }
      });
    }, 15000);
    return () => clearInterval(reminderInterval.current);
  }, [notes]);

  const bg = dark ? "#0f172a" : "#f8fafc";
  const surface = dark ? "#1e293b" : "#ffffff";
  const surface2 = dark ? "#334155" : "#f1f5f9";
  const text = dark ? "#f1f5f9" : "#1e293b";
  const sub = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "#334155" : "#e2e8f0";

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      && (filterCat === "Todas" || n.category === filterCat);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const openNote = (n) => { setCurrent({ ...n }); setMdMode("edit"); setView("edit"); };
  const openNew = () => { setCurrent(emptyNote()); setMdMode("edit"); setView("edit"); };

  const saveNote = () => {
    if (!current.title.trim()) return;
    setNotes(prev => {
      const exists = prev.find(n => n.id === current.id);
      return exists ? prev.map(n => n.id === current.id ? current : n) : [current, ...prev];
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setView("list");
  };

  const deleteNote = (id) => { setNotes(prev => prev.filter(n => n.id !== id)); setView("list"); };

  const byCat = CATEGORIES.map(c => ({ cat: c, count: notes.filter(n => n.category === c).length })).filter(x => x.count > 0);
  const withReminder = notes.filter(n => n.reminder).length;
  const recent = notes.filter(n => (new Date() - new Date(n.createdAt)) < 7 * 86400000).length;

  const s = {
    app: { minHeight: "100vh", background: bg, color: text, fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column" },
    header: { background: surface, borderBottom: `1px solid ${border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 },
    nav: { display: "flex", gap: 4 },
    navBtn: (v) => ({ background: view === v ? "#6366f1" : "transparent", color: view === v ? "#fff" : sub, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }),
    iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: sub, fontSize: 18, padding: "4px 8px", borderRadius: 8 },
    body: { flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "20px 16px" },
    input: { background: surface2, border: `1px solid ${border}`, color: text, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
    tag: (c) => ({ background: CAT_COLORS[c] + "33", color: CAT_COLORS[c], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }),
    card: { background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 12, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" },
    fab: { position: "fixed", bottom: 28, right: 28, width: 54, height: 54, borderRadius: "50%", background: "#6366f1", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px #6366f155", display: "flex", alignItems: "center", justifyContent: "center" },
    select: { background: surface2, border: `1px solid ${border}`, color: text, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
    btn: (v) => ({ background: v === "primary" ? "#6366f1" : v === "danger" ? "#ef444422" : surface2, color: v === "primary" ? "#fff" : v === "danger" ? "#ef4444" : text, border: "none", borderRadius: 10, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }),
    modeBtn: (m) => ({ background: mdMode === m ? "#6366f1" : surface2, color: mdMode === m ? "#fff" : sub, border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }),
    statCard: { background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 20, flex: 1, minWidth: 120, textAlign: "center" },
    alert: { position: "fixed", top: 20, right: 20, background: "#fbbf24", color: "#1e293b", borderRadius: 12, padding: "14px 20px", fontWeight: 700, boxShadow: "0 4px 20px #0004", zIndex: 100, maxWidth: 300 }
  };

  const mdToolbar = [
    { label: "B", title: "Negrita", wrap: ["**", "**"] },
    { label: "I", title: "Itálica", wrap: ["*", "*"] },
    { label: "~~", title: "Tachado", wrap: ["~~", "~~"] },
    { label: "`", title: "Código inline", wrap: ["`", "`"] },
    { label: "H1", title: "Título 1", line: "# " },
    { label: "H2", title: "Título 2", line: "## " },
    { label: "H3", title: "Título 3", line: "### " },
    { label: "—", title: "Separador", insert: "\n---\n" },
    { label: "• Lista", title: "Lista", line: "- " },
    { label: "☑ Check", title: "Checkbox", line: "- [ ] " },
    { label: "> Cita", title: "Cita", line: "> " },
  ];

  const textareaRef = useRef(null);
  const applyFormat = (tool) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const val = current.content;
    let newVal, newCursor;
    if (tool.wrap) {
      const sel = val.slice(start, end) || "texto";
      newVal = val.slice(0, start) + tool.wrap[0] + sel + tool.wrap[1] + val.slice(end);
      newCursor = start + tool.wrap[0].length + sel.length + tool.wrap[1].length;
    } else if (tool.line) {
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      newVal = val.slice(0, lineStart) + tool.line + val.slice(lineStart);
      newCursor = lineStart + tool.line.length + (start - lineStart);
    } else if (tool.insert) {
      newVal = val.slice(0, start) + tool.insert + val.slice(end);
      newCursor = start + tool.insert.length;
    }
    setCurrent(c => ({ ...c, content: newVal }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newCursor, newCursor); }, 0);
  };

  return (
    <div style={s.app}>
      {reminderAlert && (
        <div style={s.alert}>
          ⏰ Recordatorio: <b>{reminderAlert.title}</b>
          <button onClick={() => setReminderAlert(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", fontWeight: 900 }}>✕</button>
        </div>
      )}
      <div style={s.header}>
        <div style={s.logo}>📓 <span>MisNotas</span></div>
        <div style={s.nav}>
          <button style={s.navBtn("list")} onClick={() => setView("list")}>Notas</button>
          <button style={s.navBtn("stats")} onClick={() => setView("stats")}>Estadísticas</button>
        </div>
        <button style={s.iconBtn} onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
      </div>

      <div style={s.body}>
        {/* LIST */}
        {view === "list" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input style={{ ...s.input, flex: 1 }} placeholder="🔍 Buscar notas..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <button style={{ background: filterCat === "Todas" ? "#6366f1" : surface2, color: filterCat === "Todas" ? "#fff" : sub, border: "none", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }} onClick={() => setFilterCat("Todas")}>Todas</button>
              {CATEGORIES.map(c => (
                <button key={c} style={{ background: filterCat === c ? CAT_COLORS[c] : surface2, color: filterCat === c ? "#fff" : sub, border: "none", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }} onClick={() => setFilterCat(c)}>{c}</button>
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", color: sub, marginTop: 60 }}>
                <div style={{ fontSize: 48 }}>📭</div>
                <p>No hay notas. ¡Crea la primera!</p>
              </div>
            )}
            {filtered.map(n => {
              const rem = formatReminder(n.reminder);
              return (
                <div key={n.id} style={s.card} onClick={() => openNote(n)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px #0003"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{n.title || "Sin título"}</div>
                    <span style={s.tag(n.category)}>{n.category}</span>
                  </div>
                  <div style={{ color: sub, fontSize: 13, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {n.content.replace(/[#*`_~>\-\[\]]/g, "").trim() || <i>Sin contenido</i>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: sub }}>📅 {formatDate(n.createdAt)}</span>
                    {rem && <span style={{ fontSize: 11, color: rem.color, fontWeight: 700 }}>⏰ {rem.label}</span>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* EDIT */}
        {view === "edit" && current && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{notes.find(n => n.id === current.id) ? "Editar nota" : "Nueva nota"}</h2>
              {saved && <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13 }}>✓ Guardado</span>}
            </div>

            {/* Title */}
            <label style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Título</label>
            <input style={{ ...s.input, marginBottom: 16 }} placeholder="Título de la nota..." value={current.title} onChange={e => setCurrent(c => ({ ...c, title: e.target.value }))} />

            {/* MD Mode Switcher */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: 1 }}>Contenido</label>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={s.modeBtn("edit")} onClick={() => setMdMode("edit")}>✏️ Editar</button>
                <button style={s.modeBtn("split")} onClick={() => setMdMode("split")}>⬛ Split</button>
                <button style={s.modeBtn("preview")} onClick={() => setMdMode("preview")}>👁 Preview</button>
              </div>
            </div>

            {/* Toolbar (edit / split) */}
            {mdMode !== "preview" && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, background: surface2, borderRadius: 10, padding: "6px 8px" }}>
                {mdToolbar.map((t, i) => (
                  <button key={i} title={t.title} onClick={() => applyFormat(t)}
                    style={{ background: "transparent", border: `1px solid ${border}`, color: text, borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontStyle: t.label === "I" ? "italic" : "normal", textDecoration: t.label === "~~" ? "line-through" : "none" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Editor area */}
            <div style={{ display: "flex", gap: 12 }}>
              {mdMode !== "preview" && (
                <textarea
                  ref={textareaRef}
                  style={{ background: surface2, border: `1px solid ${border}`, color: text, borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", width: "100%", minHeight: 220, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace", flex: 1 }}
                  placeholder={"Escribe en Markdown...\n\n# Título\n**negrita**, *itálica*\n- [ ] tarea pendiente\n- [x] tarea hecha"}
                  value={current.content}
                  onChange={e => setCurrent(c => ({ ...c, content: e.target.value }))}
                />
              )}
              {mdMode !== "edit" && (
                <div style={{ flex: 1, background: surface2, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", minHeight: 220, overflowY: "auto", fontSize: 14 }}>
                  {current.content ? <MarkdownPreview content={current.content} /> : <span style={{ color: sub, fontStyle: "italic" }}>La preview aparecerá aquí...</span>}
                </div>
              )}
            </div>

            {/* Category & Reminder */}
            <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Categoría</label>
                <select style={s.select} value={current.category} onChange={e => setCurrent(c => ({ ...c, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Recordatorio</label>
                <input type="datetime-local" style={s.input} value={current.reminder} onChange={e => setCurrent(c => ({ ...c, reminder: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              {notes.find(n => n.id === current.id) && <button style={s.btn("danger")} onClick={() => deleteNote(current.id)}>🗑 Eliminar</button>}
              <button style={s.btn("secondary")} onClick={() => setView("list")}>Cancelar</button>
              <button style={s.btn("primary")} onClick={saveNote}>💾 Guardar</button>
            </div>
          </div>
        )}

        {/* STATS */}
        {view === "stats" && (
          <>
            <h2 style={{ marginBottom: 20 }}>📊 Estadísticas</h2>
            <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
              {[{ n: notes.length, l: "Total de notas", e: "📓" }, { n: recent, l: "Esta semana", e: "🗓" }, { n: withReminder, l: "Con recordatorio", e: "⏰" }, { n: CATEGORIES.filter(c => notes.some(n => n.category === c)).length, l: "Categorías usadas", e: "🏷" }].map((x, i) => (
                <div key={i} style={s.statCard}>
                  <div style={{ fontSize: 28 }}>{x.e}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#6366f1" }}>{x.n}</div>
                  <div style={{ fontSize: 12, color: sub, marginTop: 4 }}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 15 }}>Notas por categoría</h3>
              {byCat.length === 0 && <p style={{ color: sub }}>Sin datos aún.</p>}
              {byCat.map(({ cat, count }) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cat}</span>
                    <span style={{ color: sub, fontSize: 13 }}>{count} nota{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ background: surface2, borderRadius: 10, overflow: "hidden", height: 10 }}>
                    <div style={{ height: 10, borderRadius: 10, background: CAT_COLORS[cat], width: `${Math.round((count / notes.length) * 100)}%`, transition: "width 0.6s" }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {view === "list" && <button style={s.fab} onClick={openNew}>＋</button>}
    </div>
  );
}