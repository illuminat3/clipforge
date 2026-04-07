import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname, basename, normalize } from 'path'
import { existsSync, readdirSync, statSync, mkdirSync, unlinkSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg')

// ── FFmpeg path resolution ───────────────────────────────────────────────────

function resolveFfmpegPath(savedPath?: string): string | null {
  const candidates: string[] = []

  if (savedPath) candidates.push(savedPath)

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = require('ffmpeg-static')
    if (p) candidates.push(p)
  } catch {
    // not installed
  }

  if (process.platform === 'win32') {
    candidates.push(
      'C:/ffmpeg/bin/ffmpeg.exe',
      'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
      join(app.getAppPath(), 'resources/ffmpeg/ffmpeg.exe')
    )
  }

  return candidates.find((p) => existsSync(p)) ?? null
}

function applyFfmpegPaths(store: typeof Store): void {
  const savedPath = store.get('ffmpegPath', '') as string
  const resolved = resolveFfmpegPath(savedPath || undefined)
  if (resolved) {
    ffmpeg.setFfmpegPath(resolved)
    const dir = dirname(resolved)
    const ext = extname(resolved)
    const ffprobePath = join(dir, `ffprobe${ext}`)
    if (existsSync(ffprobePath)) ffmpeg.setFfprobePath(ffprobePath)
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

let store: typeof Store | null = null

// ── Window ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#28292f',
    titleBarStyle: process.platform === 'win32' ? 'default' : 'hiddenInset',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // required for local file:// video playback
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  electronApp.setAppUserModelId('xyz.illuminat3.clipforge')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  store = new Store({
    defaults: {
      clipsDirectory: 'E:/Videos/Clips',
      outputDirectory: 'E:/Videos/Clips/Output',
      ffmpegPath: '',
      serverUrl: '',
      serverToken: '',
    },
  })

  applyFfmpegPaths(store)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Settings IPC ─────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => {
  return store?.store ?? {}
})

ipcMain.handle('settings:set', (_, key: string, value: string) => {
  store?.set(key, value)
  if (key === 'ffmpegPath' && store) applyFfmpegPaths(store)
})

ipcMain.handle('settings:selectDirectory', async (_, defaultPath?: string) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath ?? undefined,
  })
  return result.canceled ? null : result.filePaths[0] ?? null
})

ipcMain.handle('settings:selectFile', async (_, defaultPath?: string) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: defaultPath ?? undefined,
    filters: [{ name: 'Executables', extensions: ['exe', '*'] }],
  })
  return result.canceled ? null : result.filePaths[0] ?? null
})

// ── Clips IPC ────────────────────────────────────────────────────────────────

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv'])

ipcMain.handle('clips:list', async (_, directory: string) => {
  if (!directory || !existsSync(directory)) {
    return { error: `Directory not found: ${directory}`, clips: [] }
  }
  try {
    const entries = readdirSync(directory, { withFileTypes: true })
    const clips = entries
      .filter((e) => e.isFile() && VIDEO_EXTS.has(extname(e.name).toLowerCase()))
      .map((e) => {
        const filePath = join(directory, e.name)
        const stat = statSync(filePath)
        return {
          id: filePath,
          name: e.name,
          path: filePath,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    return { clips, error: null }
  } catch (err: unknown) {
    return { error: (err as Error).message, clips: [] }
  }
})

ipcMain.handle('clips:getMetadata', (_, filePath: string) => {
  return new Promise((resolve) => {
    if (!existsSync(filePath)) return resolve({ error: 'File not found' })
    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: Record<string, unknown>) => {
      if (err) return resolve({ error: err.message })
      const streams = (metadata.streams as Array<Record<string, unknown>>) ?? []
      const videoStream = streams.find((s) => s.codec_type === 'video')
      const audioStream = streams.find((s) => s.codec_type === 'audio')
      const format = (metadata.format as Record<string, unknown>) ?? {}
      const parseFps = (r?: string): number | null => {
        if (!r) return null
        const [n, d] = r.split('/')
        return d ? Number(n) / Number(d) : Number(n)
      }
      resolve({
        duration: format.duration,
        size: format.size,
        bitrate: format.bit_rate,
        width: videoStream?.width,
        height: videoStream?.height,
        fps: parseFps(videoStream?.r_frame_rate as string | undefined),
        hasAudio: !!audioStream,
      })
    })
  })
})

// Thumbnail cache: filePath → { mtime, dataUrl }
const thumbnailCache = new Map<string, { mtime: number; dataUrl: string }>()

ipcMain.handle('clips:getThumbnail', (_, filePath: string) => {
  return new Promise((resolve) => {
    if (!existsSync(filePath)) return resolve(null)

    try {
      const stat = statSync(filePath)
      const cached = thumbnailCache.get(filePath)
      if (cached && cached.mtime === stat.mtimeMs) return resolve(cached.dataUrl)
    } catch {
      // ignore stat errors
    }

    const tmp = tmpdir()
    const tmpFile = join(tmp, `clipthumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)

    ffmpeg(filePath)
      .on('error', () => {
        if (existsSync(tmpFile)) unlinkSync(tmpFile)
        resolve(null)
      })
      .on('end', () => {
        try {
          const data = readFileSync(tmpFile)
          const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`
          thumbnailCache.set(filePath, { mtime: statSync(filePath).mtimeMs, dataUrl })
          unlinkSync(tmpFile)
          resolve(dataUrl)
        } catch {
          resolve(null)
        }
      })
      .screenshots({
        timestamps: ['10%'],
        filename: basename(tmpFile),
        folder: tmp,
        size: '480x?',
      })
  })
})

ipcMain.handle(
  'clips:save',
  async (_, { inputPath, segments, outputPath }: {
    inputPath: string
    segments: Array<{ start: number; end: number }>
    outputPath: string
  }) => {
    return new Promise((resolve) => {
      const outDir = dirname(outputPath)
      if (!existsSync(outDir)) {
        try {
          mkdirSync(outDir, { recursive: true })
        } catch (e: unknown) {
          return resolve({ success: false, error: `Cannot create output dir: ${(e as Error).message}` })
        }
      }

      if (!segments || segments.length === 0) {
        return resolve({ success: false, error: 'No segments to export' })
      }

      let command = ffmpeg(inputPath)

      if (segments.length === 1) {
        const seg = segments[0]
        command
          .setStartTime(seg.start)
          .setDuration(seg.end - seg.start)
          .outputOptions(['-c copy', '-avoid_negative_ts make_zero', '-movflags +faststart'])
          .output(outputPath)
          .on('error', (err: Error) => resolve({ success: false, error: err.message }))
          .on('end', () => resolve({ success: true, outputPath }))
          .run()
      } else {
        const filterParts: string[] = []
        const concatInputs: string[] = []

        segments.forEach((seg, i) => {
          filterParts.push(
            `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}]`,
            `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`
          )
          concatInputs.push(`[v${i}][a${i}]`)
        })

        filterParts.push(
          `${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[vout][aout]`
        )

        command
          .complexFilter(filterParts.join(';'))
          .outputOptions([
            '-map [vout]',
            '-map [aout]',
            '-c:v libx264',
            '-c:a aac',
            '-movflags +faststart',
          ])
          .output(outputPath)
          .on('error', (err: Error) => resolve({ success: false, error: err.message }))
          .on('end', () => resolve({ success: true, outputPath }))
          .run()
      }
    })
  }
)

ipcMain.handle('clips:saveDialog', async (_, defaultPath: string) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

ipcMain.handle('clips:openFileLocation', (_, filePath: string) => {
  shell.showItemInFolder(normalize(filePath))
  return { success: true }
})

ipcMain.handle('clips:delete', async (_, filePath: string) => {
  try {
    if (!existsSync(filePath)) return { success: false, error: 'File not found' }
    unlinkSync(filePath)
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
})
