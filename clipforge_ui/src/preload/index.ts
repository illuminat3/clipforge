import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const clipforgeAPI = {
  win: {
    setTitleBarOverlay: (overlay: { color: string; symbolColor: string }): Promise<void> =>
      ipcRenderer.invoke('win:setTitleBarOverlay', overlay)
  },
  settings: {
    get: (): Promise<Record<string, string>> => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
    selectDirectory: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectDirectory', defaultPath),
    selectFile: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectFile', defaultPath)
  },
  clips: {
    list: (directory: string) => ipcRenderer.invoke('clips:list', directory),
    getMetadata: (filePath: string) => ipcRenderer.invoke('clips:getMetadata', filePath),
    getThumbnail: (filePath: string) => ipcRenderer.invoke('clips:getThumbnail', filePath),
    save: (args: {
      inputPath: string
      segments: { start: number; end: number }[]
      outputPath: string
    }) => ipcRenderer.invoke('clips:save', args),
    saveDialog: (defaultPath?: string) => ipcRenderer.invoke('clips:saveDialog', defaultPath),
    delete: (filePath: string) => ipcRenderer.invoke('clips:delete', filePath),
    openFileLocation: (filePath: string) => ipcRenderer.invoke('clips:openFileLocation', filePath)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', clipforgeAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.electronAPI = clipforgeAPI
}
