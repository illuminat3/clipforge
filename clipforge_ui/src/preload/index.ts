import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  settings: {
    get: (): Promise<Record<string, string>> => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
    selectDirectory: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectDirectory', defaultPath),
    selectFile: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectFile', defaultPath),
  },
  clips: {
    list: (directory: string) => ipcRenderer.invoke('clips:list', directory),
    getMetadata: (filePath: string) => ipcRenderer.invoke('clips:getMetadata', filePath),
    getThumbnail: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('clips:getThumbnail', filePath),
    save: (args: {
      inputPath: string
      segments: Array<{ start: number; end: number }>
      outputPath: string
    }) => ipcRenderer.invoke('clips:save', args),
    saveDialog: (defaultPath: string): Promise<string | null> =>
      ipcRenderer.invoke('clips:saveDialog', defaultPath),
    delete: (filePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('clips:delete', filePath),
    openFileLocation: (filePath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('clips:openFileLocation', filePath),
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = electronAPI
}
