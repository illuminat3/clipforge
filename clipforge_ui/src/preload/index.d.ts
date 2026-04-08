import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: {
      settings: {
        get: () => Promise<{
          clipsDirectory: string
          outputDirectory: string
          ffmpegPath: string
          serverUrl: string
          serverToken: string
        }>
        set: (key: string, value: string) => Promise<void>
        selectDirectory: (defaultPath?: string) => Promise<string | null>
        selectFile: (defaultPath?: string) => Promise<string | null>
      }
      clips: {
        list: (directory: string) => Promise<unknown>
        getMetadata: (filePath: string) => Promise<unknown>
        getThumbnail: (filePath: string) => Promise<string | null>
        save: (args: {
          inputPath: string
          segments: { start: number; end: number }[]
          outputPath: string
        }) => Promise<unknown>
        saveDialog: (defaultPath?: string) => Promise<string | null>
        delete: (filePath: string) => Promise<{ success: boolean; error?: string }>
        openFileLocation: (filePath: string) => Promise<{ success: boolean }>
      }
    }
  }
}
