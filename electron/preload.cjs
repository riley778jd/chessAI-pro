const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('chessaiDesktop', {
  platform: process.platform,
  isElectron: true,
});
