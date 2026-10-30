// Janela da area de trabalho: so recebe a lista de criaturas ligadas.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terrarioArea', {
  aoMudar: fn => {
    ipcRenderer.on('area:criaturas', (_e, lista) => fn(lista));
    ipcRenderer.send('area:pronta');
  },
});
