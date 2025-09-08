const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (payload) => ipcRenderer.invoke('data:save', payload),
  exportJSON: () => ipcRenderer.invoke('data:export'),
  importJSON: () => ipcRenderer.invoke('data:import')
});
