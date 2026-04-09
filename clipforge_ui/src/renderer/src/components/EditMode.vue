<template>
  <div class="edit-layout">
    <div class="edit-header">
      <div class="header-left">
        <button class="back-btn" @click="$emit('back')">
          <ArrowLeft :size="16" />
          Preview
        </button>
        <span class="separator">/</span>
        <span class="clip-title" :title="clip.name">{{ clipDisplayName }}</span>
        <span class="editing-badge">Editing</span>
      </div>
      <div class="header-right">
        <button disabled class="action-btn muted" title="Coming soon – publish to server">
          <Upload :size="14" />
          Publish
        </button>
        <button class="action-btn accent" @click="openSaveDialog">
          <Save :size="14" />
          Save
        </button>
        <button class="icon-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div class="edit-content">
      <div class="video-area">
        <video
          v-if="videoSrc"
          ref="videoEl"
          :src="videoSrc"
          class="video-el"
          :muted="muted"
          @timeupdate="handleTimeUpdate"
          @loadedmetadata="handleLoadedMetadata"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="isPlaying = false"
          @click="togglePlay"
        />
        <div v-else class="no-source">No video source</div>
      </div>

      <div class="edit-controls">
        <div class="toolbar">
          <span class="label-sm">Tool:</span>
          <button
            :class="['tool-btn', { active: tool === 'select' }]"
            title="Select / Trim (S)"
            @click="tool = 'select'"
          >
            <MousePointer :size="14" />
            Select
          </button>
          <button
            :class="['tool-btn', { active: tool === 'razor' }]"
            title="Razor cut (R)"
            @click="tool = 'razor'"
          >
            <Scissors :size="14" />
            Razor
          </button>

          <div class="divider" />

          <button class="ghost-btn" title="Reset all edits" @click="handleReset">
            <RotateCcw :size="13" />
            Reset
          </button>
          <button
            class="ghost-btn"
            title="Snap all clips to left — remove gaps"
            @click="handleSnapToLeft"
          >
            <ChevronsLeft :size="13" />
            Snap Left
          </button>

          <div class="spacer" />

          <span v-if="editState" class="label-sm">
            {{ segCount }} {{ segCount === 1 ? 'clip' : 'clips' }}
            <span v-if="selectedSeg !== null" class="accent-text">
              · clip {{ selectedSeg + 1 }} selected</span
            >
          </span>
        </div>

        <EditTimeline
          v-if="editState && duration > 0"
          :duration="duration"
          :segments="editState.segments"
          :selected-seg="selectedSeg"
          :current-time="currentTime"
          :tool="tool"
          @change="(segs) => (editState = { segments: segs })"
          @select-seg="selectedSeg = $event"
          @seek="seekTo"
        />
        <div v-else class="timeline-placeholder animate-pulse" />

        <div class="playback-row">
          <button class="ctrl-btn round" @click="togglePlay">
            <Pause v-if="isPlaying" :size="14" />
            <Play v-else :size="14" style="margin-left: 2px" />
          </button>

          <span class="time-mono">{{ formatTime(currentTime) }}</span>
          <span class="separator-text">/</span>
          <span class="time-mono muted">{{ formatTime(duration) }}</span>

          <template v-if="editState">
            <span class="separator-text ml">In:</span>
            <span class="time-mono yellow">{{ formatTime(displayStart) }}</span>
            <span class="separator-text">Out:</span>
            <span class="time-mono yellow">{{ formatTime(displayEnd) }}</span>
          </template>

          <div class="spacer" />

          <button class="ctrl-icon" @click="muted = !muted">
            <VolumeX v-if="muted" :size="16" />
            <Volume2 v-else :size="16" />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="muted ? 0 : volume"
            class="volume-slider"
            @input="handleVolumeInput"
          />
        </div>

        <div class="hints-row">
          <span><kbd>Space</kbd> Play/Pause</span>
          <span><kbd>S</kbd> Select tool</span>
          <span><kbd>R</kbd> Razor tool</span>
          <span><kbd>← →</kbd> Seek 5s</span>
          <span><kbd>Del / ⌫</kbd> Remove selected clip</span>
        </div>
      </div>
    </div>

    <SaveDialog
      v-if="showSaveDialog"
      :clip-name="clip.name"
      :saving="saving"
      :error="saveError"
      @save="handleSave"
      @close="showSaveDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ArrowLeft,
  X,
  Save,
  Play,
  Pause,
  MousePointer,
  Scissors,
  Volume2,
  VolumeX,
  RotateCcw,
  Upload,
  ChevronsLeft
} from 'lucide-vue-next'
import type { LocalClipService, ClipMeta, EditSegment } from '@renderer/services/clipService'
import EditTimeline from './EditTimeline.vue'
import SaveDialog from './SaveDialog.vue'

defineOptions({ name: 'EditMode' })

const props = defineProps<{
  clip: ClipMeta
  service: LocalClipService
  outputDirectory: string
}>()

const emit = defineEmits<{
  back: []
  close: []
  saved: [outputPath: string]
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const duration = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const muted = ref(false)
const volume = ref(1)

const tool = ref<'select' | 'razor'>('select')
const editState = ref<{ segments: EditSegment[] } | null>(null)
const selectedSeg = ref<number | null>(null)
const showSaveDialog = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

let editStateSnapshot: { segments: EditSegment[] } | null = null
watch(
  editState,
  (v) => {
    editStateSnapshot = v
  },
  { deep: true }
)

let playingSegIdx = 0

const videoSrc = computed(() => {
  const p = props.clip.path
  if (!p) return null
  return `file:///${p.replace(/\\/g, '/')}`
})

const clipDisplayName = computed(() => props.clip.name.replace(/\.[^.]+$/, ''))
const segCount = computed(() => editState.value?.segments?.length ?? 1)

const displaySeg = computed(() =>
  selectedSeg.value !== null ? (editState.value?.segments?.[selectedSeg.value] ?? null) : null
)
const displayStart = computed(
  () => displaySeg.value?.start ?? editState.value?.segments?.[0]?.start ?? 0
)
const displayEnd = computed(
  () =>
    displaySeg.value?.end ??
    editState.value?.segments?.[editState.value.segments.length - 1]?.end ??
    duration.value
)

function handleLoadedMetadata(): void {
  const d = videoEl.value?.duration || 0
  duration.value = d
  if (!editState.value) {
    editState.value = { segments: [{ start: 0, end: d, timelineOffset: 0 }] }
  }
}

function handleTimeUpdate(): void {
  if (videoEl.value) currentTime.value = videoEl.value.currentTime
}

function togglePlay(): void {
  const v = videoEl.value
  if (!v) return
  if (v.paused) v.play()
  else v.pause()
}

function getOrderedSegs(segs: EditSegment[]): EditSegment[] {
  return [...segs].sort((a, b) => (a.timelineOffset ?? 0) - (b.timelineOffset ?? 0))
}

function seekTo(t: number): void {
  if (videoEl.value) {
    videoEl.value.currentTime = t
    currentTime.value = t
  }
  const segs = editStateSnapshot?.segments
  if (segs) {
    const ordered = getOrderedSegs(segs)
    const idx = ordered.findIndex((s) => t >= s.start && t <= s.end)
    playingSegIdx = idx === -1 ? 0 : idx
  }
}

function handleReset(): void {
  if (duration.value) {
    editState.value = { segments: [{ start: 0, end: duration.value, timelineOffset: 0 }] }
    selectedSeg.value = null
    playingSegIdx = 0
    if (videoEl.value) videoEl.value.currentTime = 0
  }
}

function handleSnapToLeft(): void {
  if (!editState.value?.segments?.length) return
  const ordered = getOrderedSegs(editState.value.segments)
  let acc = 0
  const snapped = ordered.map((seg) => {
    const s = { ...seg, timelineOffset: acc }
    acc += seg.end - seg.start
    return s
  })
  editState.value = { segments: snapped }
  selectedSeg.value = null
}

watch(
  editState,
  () => {
    const v = videoEl.value
    if (!editState.value || !v) return
    const segs = editState.value.segments
    if (!segs.length) return

    const onTimeUpdate = (): void => {
      const t = v.currentTime
      const ordered = getOrderedSegs(segs)
      const idx = playingSegIdx
      if (idx >= ordered.length) {
        v.pause()
        v.currentTime = ordered[0]?.start ?? 0
        playingSegIdx = 0
        return
      }
      const seg = ordered[idx]
      if (t < seg.start) {
        v.currentTime = seg.start
      } else if (t >= seg.end) {
        if (idx + 1 < ordered.length) {
          playingSegIdx = idx + 1
          v.currentTime = ordered[idx + 1].start
        } else {
          v.pause()
          v.currentTime = ordered[0].start
          playingSegIdx = 0
        }
      }
    }

    const onEnded = (): void => {
      const ordered = getOrderedSegs(segs)
      if (playingSegIdx + 1 < ordered.length) {
        playingSegIdx += 1
        v.currentTime = ordered[playingSegIdx].start
        v.play()
      } else {
        v.currentTime = ordered[0]?.start ?? 0
        playingSegIdx = 0
      }
    }

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('ended', onEnded)
  },
  { deep: true }
)

function handleVolumeInput(e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  volume.value = v
  muted.value = v === 0
  if (videoEl.value) videoEl.value.volume = v
}

function openSaveDialog(): void {
  saveError.value = null
  showSaveDialog.value = true
}

async function handleSave(mode: 'overwrite' | 'copy' | 'browse'): Promise<void> {
  if (!editState.value) return
  saving.value = true
  saveError.value = null
  try {
    const result = await props.service.saveClip(props.clip.id, editState.value, {
      mode,
      outputDirectory: props.outputDirectory
    })
    if (!result.success) {
      saveError.value = result.error || 'Save failed'
    } else {
      showSaveDialog.value = false
      if (result.outputPath) emit('saved', result.outputPath)
    }
  } catch (err) {
    saveError.value = (err as Error).message
  }
  saving.value = false
}

function onKey(e: KeyboardEvent): void {
  if ((e.target as HTMLElement).tagName === 'INPUT') return
  if (e.code === 'Space') {
    e.preventDefault()
    togglePlay()
  }
  if (e.code === 'KeyS') tool.value = 'select'
  if (e.code === 'KeyR') tool.value = 'razor'
  if (e.code === 'Escape' && showSaveDialog.value) showSaveDialog.value = false
  if (e.code === 'ArrowRight')
    seekTo(Math.min((currentTime.value || 0) + (e.shiftKey ? 1 : 5), duration.value))
  if (e.code === 'ArrowLeft') seekTo(Math.max((currentTime.value || 0) - (e.shiftKey ? 1 : 5), 0))
  if (
    (e.code === 'Delete' || e.code === 'Backspace') &&
    selectedSeg.value !== null &&
    editState.value
  ) {
    e.preventDefault()
    const newSegs = editState.value.segments.filter((_, i) => i !== selectedSeg.value)
    editState.value = { segments: newSegs }
    selectedSeg.value = null
    playingSegIdx = 0
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00.000'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  const base = `${m}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  return h > 0 ? `${h}:${base}` : base
}
</script>

<style scoped>
.edit-layout {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--color-primary-background);
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-secondary-background);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-secondary-text);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s;
}

.back-btn:hover {
  color: var(--color-primary-text);
}

.separator {
  color: var(--color-border);
}

.clip-title {
  font-weight: 500;
  color: var(--color-primary-text);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.editing-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.action-btn.accent {
  background: var(--color-accent);
  color: #fff;
}

.action-btn.accent:hover {
  background: var(--color-accent-hover);
}

.action-btn.muted {
  background: var(--color-surface-active);
  color: var(--color-tertiary-text);
  cursor: not-allowed;
  opacity: 0.5;
}

.icon-btn {
  padding: 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    background 0.15s;
  margin-left: 4px;
}

.icon-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.edit-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.video-area {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.video-el {
  max-height: 100%;
  max-width: 100%;
  cursor: pointer;
}

.no-source {
  color: var(--color-tertiary-text);
  font-size: 13px;
}

.edit-controls {
  flex-shrink: 0;
  background: var(--color-secondary-background);
  border-top: 1px solid var(--color-border);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-sm {
  font-size: 11px;
  color: var(--color-tertiary-text);
  margin-right: 2px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: var(--color-surface-active);
  color: var(--color-secondary-text);
  transition:
    background 0.15s,
    color 0.15s;
}

.tool-btn:hover {
  background: var(--color-border);
  color: var(--color-primary-text);
}

.tool-btn.active {
  background: var(--color-accent);
  color: #fff;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 2px;
}

.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  font-size: 11px;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.ghost-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.spacer {
  flex: 1;
}

.accent-text {
  color: var(--color-secondary-text);
}

.timeline-placeholder {
  height: 64px;
  background: var(--color-surface-active);
  border-radius: 4px;
}

.playback-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn.round {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface-active);
  color: var(--color-primary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}

.ctrl-btn.round:hover {
  background: var(--color-border);
}

.time-mono {
  font-size: 11px;
  font-family: monospace;
  color: var(--color-secondary-text);
  white-space: nowrap;
}

.time-mono.muted {
  color: var(--color-tertiary-text);
}

.time-mono.yellow {
  color: #facc15;
}

.separator-text {
  font-size: 11px;
  color: var(--color-tertiary-text);
}

.ml {
  margin-left: 8px;
}

.ctrl-icon {
  border: none;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.ctrl-icon:hover {
  color: var(--color-primary-text);
}

.volume-slider {
  width: 80px;
  accent-color: var(--color-accent);
}

.hints-row {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--color-tertiary-text);
  flex-wrap: wrap;
}

kbd {
  font-family: monospace;
  background: var(--color-surface-active);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
}
</style>
