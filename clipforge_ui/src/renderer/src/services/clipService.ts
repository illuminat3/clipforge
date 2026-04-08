export interface ClipMeta {
  id: string
  name: string
  path: string
  size: number
  createdAt: string
  modifiedAt: string
}

export interface ClipMetadata {
  duration?: number
  size?: number
  bitrate?: number
  width?: number
  height?: number
  fps?: number | null
  hasAudio?: boolean
  error?: string
}

export interface ClipListResult {
  clips: ClipMeta[]
  error: string | null
}

export interface SaveResult {
  success: boolean
  outputPath?: string
  error?: string
}

export interface AppSettings {
  clipsDirectory: string
  outputDirectory: string
  ffmpegPath: string
  serverUrl: string
  serverToken: string
}

export interface EditSegment {
  start: number
  end: number
  timelineOffset: number
}

export interface EditSpec {
  segments: EditSegment[]
}

export interface SaveOptions {
  mode: 'overwrite' | 'copy' | 'browse'
  outputDirectory: string
}

export class LocalClipService {
  constructor(
    public clipsDirectory: string,
    public outputDirectory: string
  ) {}

  async listClips(): Promise<ClipListResult> {
    return window.electronAPI.clips.list(this.clipsDirectory) as Promise<ClipListResult>
  }

  async listOutputClips(): Promise<ClipListResult> {
    return window.electronAPI.clips.list(this.outputDirectory) as Promise<ClipListResult>
  }

  async deleteClip(id: string): Promise<{ success: boolean; error?: string }> {
    return window.electronAPI.clips.delete(id)
  }

  async getClipDetails(id: string): Promise<ClipMetadata> {
    return window.electronAPI.clips.getMetadata(id) as Promise<ClipMetadata>
  }

  async getThumbnail(id: string): Promise<string | null> {
    return window.electronAPI.clips.getThumbnail(id)
  }

  async saveClip(inputId: string, editSpec: EditSpec, options: SaveOptions): Promise<SaveResult> {
    const segments = buildSegments(editSpec)
    let outputPath: string | null

    if (options.mode === 'overwrite') {
      outputPath = inputId.replace(/\.[^.]+$/, '.mp4')
    } else if (options.mode === 'browse') {
      const fileName = generateClipFilename()
      const suggested = `${this.outputDirectory}/${fileName}`.replace(/\\/g, '/')
      outputPath = await window.electronAPI.clips.saveDialog(suggested)
      if (!outputPath) return { success: false, error: 'Cancelled' }
      if (!outputPath.toLowerCase().endsWith('.mp4')) {
        outputPath = outputPath.replace(/\.[^.]+$/, '.mp4')
      }
    } else {
      const fileName = generateClipFilename()
      outputPath = `${this.outputDirectory}/${fileName}`.replace(/\\/g, '/')
    }

    return window.electronAPI.clips.save({ inputPath: inputId, segments, outputPath }) as Promise<SaveResult>
  }
}

function generateClipFilename(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `clip_${ts}.mp4`
}

function buildSegments(editSpec: EditSpec): { start: number; end: number }[] {
  return (editSpec.segments || [])
    .filter((s) => s.end > s.start + 0.01)
    .sort((a, b) => (a.timelineOffset ?? 0) - (b.timelineOffset ?? 0))
    .map(({ start, end }) => ({ start, end }))
}
