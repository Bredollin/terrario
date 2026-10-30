// Ponte minima entre a tela e o app: so estas tres funcoes.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terrarioApp', {
  ligadas: ids => ipcRenderer.send('terrario:ligadas', ids),
  bloqueio: liga => ipcRenderer.invoke('terrario:bloqueio', !!liga),
  estado: () => ipcRenderer.invoke('terrario:estado'),
});
