import {
  ClipService,
  ClipMeta,
  ClipDetail,
  EditSpec,
  SaveOptions,
  SaveResult,
  ListResult,
  Segment,
} from './clipService'

type ElectronAPI = {
  settings: {
    get: () => Promise<Record<string, string>>
    set: (key: string, value: string) => Promise<void>
    selectDirectory: (defaultPath?: string) => Promise<string | null>
    selectFile: (defaultPath?: string) => Promise<string | null>
  }
  clips: {
    list: (directory: string) => Promise<ListResult>
    getMetadata: (filePath: string) => Promise<ClipDetail>
    getThumbnail: (filePath: string) => Promise<string | null>
    save: (args: {
      inputPath: string
      segments: Array<{ start: number; end: number }>
      outputPath: string
    }) => Promise<SaveResult>
    saveDialog: (defaultPath: string) => Promise<string | null>
    delete: (filePath: string) => Promise<{ success: boolean; error?: string }>
    openFileLocation: (filePath: string) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export type { ElectronAPI }
export type { ClipMeta }

export class LocalClipService extends ClipService {
  constructor(
    private clipsDirectory: string,
    private outputDirectory: string
  ) {
    super()
  }

  async listClips(): Promise<ListResult> {
    return window.electronAPI!.clips.list(this.clipsDirectory)
  }

  async listOutputClips(): Promise<ListResult> {
    return window.electronAPI!.clips.list(this.outputDirectory)
  }

  async deleteClip(id: string): Promise<{ success: boolean; error?: string }> {
    return window.electronAPI!.clips.delete(id)
  }

  async getClipDetails(id: string): Promise<ClipDetail> {
    return window.electronAPI!.clips.getMetadata(id)
  }

  async getThumbnail(id: string): Promise<string | null> {
    return window.electronAPI!.clips.getThumbnail(id)
  }

  supportsLocalSave(): boolean {
    return true
  }

  supportsPublish(): boolean {
    return false
  }

  async saveClip(inputId: string, editSpec: EditSpec, options: SaveOptions): Promise<SaveResult> {
    const segments = buildSegments(editSpec)
    let outputPath: string

    if (options.mode === 'overwrite') {
      outputPath = inputId.replace(/\.[^.]+$/, '.mp4')
    } else if (options.mode === 'browse') {
      const fileName = generateClipFilename()
      const suggested = `${this.outputDirectory}/${fileName}`.replace(/\\/g, '/')
      const picked = await window.electronAPI!.clips.saveDialog(suggested)
      if (!picked) return { success: false, error: 'Cancelled' }
      outputPath = picked.toLowerCase().endsWith('.mp4')
        ? picked
        : picked.replace(/\.[^.]+$/, '.mp4')
    } else {
      const fileName = generateClipFilename()
      outputPath = `${this.outputDirectory}/${fileName}`.replace(/\\/g, '/')
    }

    return window.electronAPI!.clips.save({ inputPath: inputId, segments, outputPath })
  }
}

function generateClipFilename(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `clip_${ts}.mp4`
}

function buildSegments(editSpec: EditSpec): Array<{ start: number; end: number }> {
  return (editSpec.segments || [])
    .filter((s: Segment) => s.end > s.start + 0.01)
    .sort((a: Segment, b: Segment) => (a.timelineOffset ?? 0) - (b.timelineOffset ?? 0))
    .map(({ start, end }: Segment) => ({ start, end }))
}
