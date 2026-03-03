const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readNotes:  ()        => ipcRenderer.invoke('notes:read'),
  writeNotes: (notes)   => ipcRenderer.invoke('notes:write', notes),
  notify:     (payload) => ipcRenderer.invoke('notify', payload)
})