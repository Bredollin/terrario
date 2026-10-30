// Ponte minima entre a tela e o app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terrarioApp', {
  ligadas: lista => ipcRenderer.send('terrario:ligadas', lista),
  bloqueio: liga => ipcRenderer.invoke('terrario:bloqueio', !!liga),
  area: liga => ipcRenderer.invoke('terrario:area', !!liga),
  protetor: liga => ipcRenderer.invoke('terrario:protetor', !!liga),
  verProtetor: () => ipcRenderer.invoke('terrario:ver-protetor'),
  estado: () => ipcRenderer.invoke('terrario:estado'),
  aoMudarEstado: fn => ipcRenderer.on('terrario:estado', (_e, estado) => fn(estado)),
});
