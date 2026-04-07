export interface ClipMeta {
  id: string
  name: string
  path?: string
  size: number
  createdAt: string
  modifiedAt: string
}

export interface ClipDetail {
  duration?: number
  width?: number
  height?: number
  fps?: number
  hasAudio?: boolean
  bitrate?: number
  error?: string
}

export interface Segment {
  start: number
  end: number
  timelineOffset: number
}

export interface EditSpec {
  segments: Segment[]
}

export type SaveMode = 'overwrite' | 'copy' | 'browse'

export interface SaveOptions {
  mode: SaveMode
  outputDirectory?: string
}

export interface SaveResult {
  success: boolean
  outputPath?: string
  error?: string
}

export interface ListResult {
  clips: ClipMeta[]
  error: string | null
}

export abstract class ClipService {
  abstract listClips(): Promise<ListResult>
  abstract listOutputClips(): Promise<ListResult>
  abstract getClipDetails(id: string): Promise<ClipDetail>
  abstract getThumbnail(id: string): Promise<string | null>
  abstract saveClip(inputId: string, editSpec: EditSpec, options: SaveOptions): Promise<SaveResult>
  abstract deleteClip(id: string): Promise<{ success: boolean; error?: string }>

  supportsLocalSave(): boolean {
    return false
  }

  supportsPublish(): boolean {
    return false
  }
}
