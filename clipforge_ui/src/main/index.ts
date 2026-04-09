import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname, basename, normalize } from 'path'
import { existsSync, readdirSync, statSync, readFileSync, unlinkSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import ffmpeg from 'fluent-ffmpeg'

interface Settings {
  clipsDirectory: string
  outputDirectory: string
  ffmpegPath: string
  serverUrl: string
  serverToken: string
}

let store: Store<Settings>

function initStore(): void {
  store = new Store<Settings>({
    defaults: {
      clipsDirectory: '',
      outputDirectory: '',
      ffmpegPath: '',
      serverUrl: '',
      serverToken: ''
    }
  })
  applyFfmpegPaths()
}

function resolveFfmpegPaths(savedPath: string): string | null {
  const candidates: string[] = []

  if (savedPath) candidates.push(savedPath)

  if (process.platform === 'win32') {
    candidates.push(
      'C:/ffmpeg/bin/ffmpeg.exe',
      'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
      join(app.getAppPath(), 'resources/ffmpeg/ffmpeg.exe')
    )
  }

  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function applyFfmpegPaths(): void {
  if (!store) return
  const savedPath = store.get('ffmpegPath', '')
  const resolved = resolveFfmpegPaths(savedPath)
  if (resolved) {
    ffmpeg.setFfmpegPath(resolved)
    const dir = dirname(resolved)
    const ext = extname(resolved)
    const ffprobeCand = join(dir, `ffprobe${ext}`)
    if (existsSync(ffprobeCand)) ffmpeg.setFfprobePath(ffprobeCand)
  }
}

let mainWindow: BrowserWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clipforge')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initStore()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('settings:get', () => {
  if (!store) return {}
  return store.store
})

ipcMain.handle('settings:set', (_, key: string, value: string) => {
  if (!store) return
  store.set(key as keyof Settings, value)
  if (key === 'ffmpegPath') applyFfmpegPaths()
})

ipcMain.handle('settings:selectFile', async (_, defaultPath?: string) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: defaultPath || undefined,
    filters: [{ name: 'Executables', extensions: ['exe', '*'] }]
  })
  if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0]
  return null
})

ipcMain.handle('settings:selectDirectory', async (_, defaultPath?: string) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath || undefined
  })
  if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0]
  return null
})

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
          modifiedAt: stat.mtime.toISOString()
        }
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    return { clips, error: null }
  } catch (err) {
    return { error: (err as Error).message, clips: [] }
  }
})

ipcMain.handle('clips:getMetadata', (_, filePath: string) => {
  return new Promise((resolve) => {
    if (!existsSync(filePath)) return resolve({ error: 'File not found' })
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return resolve({ error: err.message })
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')
      const fps = videoStream?.r_frame_rate ? parseFraction(videoStream.r_frame_rate) : null
      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        width: videoStream?.width,
        height: videoStream?.height,
        fps,
        hasAudio: !!audioStream
      })
    })
  })
})

function parseFraction(str: string): number {
  const parts = str.split('/')
  if (parts.length === 2) {
    const num = parseFloat(parts[0])
    const den = parseFloat(parts[1])
    return den !== 0 ? num / den : 0
  }
  return parseFloat(str) || 0
}

const thumbnailCache = new Map<string, { mtime: number; dataUrl: string }>()

ipcMain.handle('clips:getThumbnail', (_, filePath: string) => {
  return new Promise((resolve) => {
    if (!existsSync(filePath)) return resolve(null)

    try {
      const stat = statSync(filePath)
      const cached = thumbnailCache.get(filePath)
      if (cached && cached.mtime === stat.mtimeMs) {
        return resolve(cached.dataUrl)
      }
    } catch {
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
        size: '480x?'
      })
  })
})

interface SaveSegment {
  start: number
  end: number
}

ipcMain.handle(
  'clips:save',
  async (
    _,
    {
      inputPath,
      segments,
      outputPath
    }: { inputPath: string; segments: SaveSegment[]; outputPath: string }
  ) => {
    return new Promise((resolve) => {
      const outDir = dirname(outputPath)
      if (!existsSync(outDir)) {
        try {
          mkdirSync(outDir, { recursive: true })
        } catch (e) {
          return resolve({
            success: false,
            error: `Cannot create output directory: ${(e as Error).message}`
          })
        }
      }

      if (!segments || segments.length === 0) {
        return resolve({ success: false, error: 'No segments to export' })
      }

      const command = ffmpeg(inputPath)

      if (segments.length === 1) {
        const seg = segments[0]
        command
          .setStartTime(seg.start)
          .setDuration(seg.end - seg.start)
          .outputOptions(['-c copy', '-avoid_negative_ts make_zero', '-movflags +faststart'])
          .output(outputPath)
          .on('error', (err) => resolve({ success: false, error: err.message }))
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

        filterParts.push(`${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[vout][aout]`)

        command
          .complexFilter(filterParts.join(';'))
          .outputOptions([
            '-map [vout]',
            '-map [aout]',
            '-c:v libx264',
            '-c:a aac',
            '-movflags +faststart'
          ])
          .output(outputPath)
          .on('error', (err) => resolve({ success: false, error: err.message }))
          .on('end', () => resolve({ success: true, outputPath }))
          .run()
      }
    })
  }
)

ipcMain.handle('clips:saveDialog', async (_, defaultPath?: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
  })
  if (!result.canceled) return result.filePath
  return null
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
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})
