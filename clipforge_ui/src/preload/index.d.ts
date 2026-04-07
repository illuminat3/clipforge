export {}

declare global {
  interface Window {
    electronAPI: {
      settings: {
        get: () => Promise<Record<string, string>>
        set: (key: string, value: string) => Promise<void>
        selectDirectory: (defaultPath?: string) => Promise<string | null>
        selectFile: (defaultPath?: string) => Promise<string | null>
      }
      clips: {
        list: (directory: string) => Promise<{ clips: unknown[]; error: string | null }>
        getMetadata: (filePath: string) => Promise<unknown>
        getThumbnail: (filePath: string) => Promise<string | null>
        save: (args: {
          inputPath: string
          segments: Array<{ start: number; end: number }>
          outputPath: string
        }) => Promise<{ success: boolean; outputPath?: string; error?: string }>
        saveDialog: (defaultPath: string) => Promise<string | null>
        delete: (filePath: string) => Promise<{ success: boolean; error?: string }>
        openFileLocation: (filePath: string) => Promise<{ success: boolean }>
      }
    }
  }
}
