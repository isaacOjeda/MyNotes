const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV !== 'production'

// Ruta de datos persistentes
const userDataPath = app.getPath('userData')
const notesFile = path.join(userDataPath, 'notes.json')

// Leer notas del disco
function readNotes() {
  try {
    if (fs.existsSync(notesFile)) {
      return JSON.parse(fs.readFileSync(notesFile, 'utf-8'))
    }
  } catch (e) {}
  return []
}

// Guardar notas al disco
function writeNotes(notes) {
  fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2), 'utf-8')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: 'hiddenInset', // estilo macOS nativo
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC: leer y guardar notas
ipcMain.handle('notes:read', () => readNotes())
ipcMain.handle('notes:write', (_, notes) => { writeNotes(notes); return true })

// IPC: notificación nativa
ipcMain.handle('notify', (_, { title, body }) => {
  new Notification({ title, body }).show()
})