// Protetor de tela: so sabe pedir para sair.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terrarioProtetor', {
  sair: () => ipcRenderer.send('protetor:sair'),
});
