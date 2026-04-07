<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ArrowLeft, X, Save, Play, Pause, MousePointer, Scissors,
  Volume2, VolumeX, RotateCcw, Upload, ChevronsLeft,
} from 'lucide-vue-next'
import EditTimeline from './EditTimeline.vue'
import SaveDialog from './SaveDialog.vue'
import type { ClipMeta, ClipService, Segment, EditSpec } from '../services/clipService'

const props = defineProps<{
  clip: ClipMeta
  service: ClipService
  outputDirectory?: string
}>()

const emit = defineEmits<{
  back: []
  close: []
  saved: [outputPath: string]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const duration = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const muted = ref(false)
const volume = ref(1)
const tool = ref<'select' | 'razor'>('select')
const editState = ref<EditSpec | null>(null)
const selectedSeg = ref<number | null>(null)
const showSaveDialog = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

// Tracks which ordered segment is currently playing
const playingSegIdx = ref(0)

const videoSrc = computed(() =>
  props.clip.path ? `file:///${props.clip.path.replace(/\\/g, '/')}` : null
)

const getOrderedSegs = (segs: Segment[]) =>
  [...segs].sort((a, b) => (a.timelineOffset ?? 0) - (b.timelineOffset ?? 0))

const handleLoadedMetadata = () => {
  const d = videoRef.value?.duration || 0
  duration.value = d
  if (!editState.value) {
    editState.value = { segments: [{ start: 0, end: d, timelineOffset: 0 }] }
  }
}

const handleTimeUpdate = () => {
  if (videoRef.value) currentTime.value = videoRef.value.currentTime
}

const togglePlay = () => {
  const v = videoRef.value
  if (!v) return
  if (v.paused) v.play()
  else v.pause()
}

const seekTo = (t: number) => {
  if (videoRef.value) {
    videoRef.value.currentTime = t
    currentTime.value = t
  }
  const segs = editState.value?.segments
  if (segs) {
    const ordered = getOrderedSegs(segs)
    const idx = ordered.findIndex((s) => t >= s.start && t <= s.end)
    playingSegIdx.value = idx === -1 ? 0 : idx
  }
}

const handleReset = () => {
  if (duration.value) {
    editState.value = { segments: [{ start: 0, end: duration.value, timelineOffset: 0 }] }
    selectedSeg.value = null
    playingSegIdx.value = 0
    if (videoRef.value) videoRef.value.currentTime = 0
  }
}

const handleSnapToLeft = () => {
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

// Segment-aware playback
watch(editState, () => {
  const v = videoRef.value
  if (!v || !editState.value) return
  const segs = editState.value.segments

  const onTimeUpdate = () => {
    const t = v.currentTime
    const ordered = getOrderedSegs(segs)
    const idx = playingSegIdx.value
    if (idx >= ordered.length) {
      v.pause(); v.currentTime = ordered[0]?.start ?? 0; playingSegIdx.value = 0; return
    }
    const seg = ordered[idx]
    if (t < seg.start) {
      v.currentTime = seg.start
    } else if (t >= seg.end) {
      if (idx + 1 < ordered.length) {
        playingSegIdx.value = idx + 1
        v.currentTime = ordered[idx + 1].start
      } else {
        v.pause(); v.currentTime = ordered[0].start; playingSegIdx.value = 0
      }
    }
  }

  const onEnded = () => {
    const ordered = getOrderedSegs(segs)
    const idx = playingSegIdx.value
    if (idx + 1 < ordered.length) {
      playingSegIdx.value = idx + 1
      v.currentTime = ordered[idx + 1].start
      v.play()
    } else {
      v.currentTime = ordered[0]?.start ?? 0; playingSegIdx.value = 0
    }
  }

  v.addEventListener('timeupdate', onTimeUpdate)
  v.addEventListener('ended', onEnded)

  return () => {
    v.removeEventListener('timeupdate', onTimeUpdate)
    v.removeEventListener('ended', onEnded)
  }
})

const handleSave = async (mode: 'overwrite' | 'copy' | 'browse') => {
  if (!editState.value) return
  saving.value = true
  saveError.value = null
  try {
    const result = await props.service.saveClip(props.clip.id, editState.value, {
      mode,
      outputDirectory: props.outputDirectory,
    })
    if (!result.success) {
      saveError.value = result.error || 'Save failed'
    } else {
      showSaveDialog.value = false
      if (result.outputPath) emit('saved', result.outputPath)
    }
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Unknown error'
  }
  saving.value = false
}

const segCount = computed(() => editState.value?.segments?.length ?? 1)
const displaySeg = computed(() =>
  selectedSeg.value !== null ? editState.value?.segments?.[selectedSeg.value] ?? null : null
)
const displayStart = computed(() =>
  displaySeg.value?.start ?? editState.value?.segments?.[0]?.start ?? 0
)
const displayEnd = computed(() =>
  displaySeg.value?.end
    ?? editState.value?.segments?.[editState.value.segments.length - 1]?.end
    ?? duration.value
)

const onKey = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return
  if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  if (e.code === 'KeyS') tool.value = 'select'
  if (e.code === 'KeyR') tool.value = 'razor'
  if (e.code === 'Escape') { if (showSaveDialog.value) showSaveDialog.value = false }
  if (e.code === 'ArrowRight') seekTo(Math.min((currentTime.value || 0) + (e.shiftKey ? 1 : 5), duration.value))
  if (e.code === 'ArrowLeft')  seekTo(Math.max((currentTime.value || 0) - (e.shiftKey ? 1 : 5), 0))
  if ((e.code === 'Delete' || e.code === 'Backspace') && selectedSeg.value !== null && editState.value) {
    e.preventDefault()
    editState.value = {
      segments: editState.value.segments.filter((_, i) => i !== selectedSeg.value),
    }
    selectedSeg.value = null
    playingSegIdx.value = 0
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const formatTime = (s: number): string => {
  if (!s || isNaN(s)) return '0:00.000'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  const base = `${m}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
    : base
}
</script>

<template>
  <div class="edit-mode">
    <!-- Header -->
    <div class="edit-header">
      <div class="edit-header-left">
        <button class="back-btn" @click="emit('back')">
          <ArrowLeft :size="16" />
          Preview
        </button>
        <span class="sep">/</span>
        <span class="edit-clip-name" :title="clip.name">
          {{ clip.name.replace(/\.[^.]+$/, '') }}
        </span>
        <span class="editing-badge">Editing</span>
      </div>

      <div class="edit-header-right">
        <button class="action-btn action-btn--disabled" disabled title="Coming soon – publish">
          <Upload :size="14" />
          Publish
        </button>
        <button class="action-btn action-btn--accent" @click="() => { saveError = null; showSaveDialog = true }">
          <Save :size="14" />
          Save
        </button>
        <button class="icon-btn" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="edit-body">
      <!-- Video -->
      <div class="video-area">
        <video
          v-if="videoSrc"
          ref="videoRef"
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
        <div v-else class="no-video">No video source</div>
      </div>

      <!-- Edit panel -->
      <div class="edit-panel">
        <!-- Toolbar -->
        <div class="toolbar">
          <span class="toolbar-label">Tool:</span>

          <button
            class="tool-btn"
            :class="{ active: tool === 'select' }"
            title="Select / Trim (S)"
            @click="tool = 'select'"
          >
            <MousePointer :size="14" />
            Select
          </button>
          <button
            class="tool-btn"
            :class="{ active: tool === 'razor' }"
            title="Razor cut (R)"
            @click="tool = 'razor'"
          >
            <Scissors :size="14" />
            Razor
          </button>

          <div class="sep-line" />

          <button class="text-btn" title="Reset all edits" @click="handleReset">
            <RotateCcw :size="13" />
            Reset
          </button>
          <button class="text-btn" title="Snap all clips to left — remove gaps" @click="handleSnapToLeft">
            <ChevronsLeft :size="13" />
            Snap Left
          </button>

          <div class="toolbar-spacer" />

          <span v-if="editState" class="seg-info">
            {{ segCount }} {{ segCount === 1 ? 'clip' : 'clips' }}
            <span v-if="selectedSeg !== null" class="seg-selected">
              · clip {{ selectedSeg + 1 }} selected
            </span>
          </span>
        </div>

        <!-- Timeline -->
        <EditTimeline
          v-if="editState && duration > 0"
          :duration="duration"
          :segments="editState.segments"
          :selected-seg="selectedSeg"
          :current-time="currentTime"
          :tool="tool"
          @change="(segs) => editState = { segments: segs }"
          @select-seg="selectedSeg = $event"
          @seek="seekTo"
        />
        <div v-else class="timeline-placeholder" />

        <!-- Playback controls -->
        <div class="playback-row">
          <button class="play-btn" @click="togglePlay">
            <Pause v-if="isPlaying" :size="14" />
            <Play v-else :size="14" class="play-icon" />
          </button>

          <span class="time-mono">{{ formatTime(currentTime) }}</span>
          <span class="sep-char">/</span>
          <span class="time-mono time-mono--dim">{{ formatTime(duration) }}</span>

          <template v-if="editState">
            <span class="in-out-label">In:</span>
            <span class="in-out-time">{{ formatTime(displayStart) }}</span>
            <span class="in-out-label">Out:</span>
            <span class="in-out-time">{{ formatTime(displayEnd) }}</span>
          </template>

          <div class="playback-spacer" />

          <button class="icon-btn-sm" @click="muted = !muted">
            <VolumeX v-if="muted" :size="16" />
            <Volume2 v-else :size="16" />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="volume-slider"
            :value="muted ? 0 : volume"
            @input="(e) => {
              const v = parseFloat((e.target as HTMLInputElement).value)
              volume = v
              muted = v === 0
              if (videoRef) videoRef.volume = v
            }"
          />
        </div>

        <!-- Keyboard hints -->
        <div class="kbd-hints">
          <span><kbd>Space</kbd> Play/Pause</span>
          <span><kbd>S</kbd> Select</span>
          <span><kbd>R</kbd> Razor</span>
          <span><kbd>← →</kbd> Seek 5s</span>
          <span><kbd>Del / ⌫</kbd> Remove selected</span>
        </div>
      </div>
    </div>

    <!-- Save dialog -->
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

<style lang="scss" scoped>
.edit-mode {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface-raised);
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  gap: 12px;
}

.edit-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-300);
  transition: color 0.15s;
  flex-shrink: 0;

  &:hover { color: var(--text-100); }
}

.sep {
  color: var(--text-400);
}

.edit-clip-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-200);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.editing-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(74, 85, 224, 0.2);
  color: var(--accent);
  flex-shrink: 0;
}

.edit-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.15s;

  &--accent {
    background: var(--accent);
    color: white;
    &:hover { background: var(--accent-hover); }
  }

  &--disabled {
    background: var(--surface-overlay);
    color: var(--text-400);
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.icon-btn {
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  color: var(--text-300);
  transition: all 0.15s;

  &:hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }
}

.edit-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.video-area {
  flex: 1;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;

  .video-el {
    max-height: 100%;
    max-width: 100%;
    cursor: pointer;
  }

  .no-video {
    color: var(--text-400);
    font-size: 13px;
  }
}

.edit-panel {
  flex-shrink: 0;
  background: var(--surface-raised);
  border-top: 1px solid var(--surface-border);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;

  .toolbar-label {
    font-size: 11px;
    color: var(--text-400);
    margin-right: 2px;
  }

  .toolbar-spacer { flex: 1; }

  .seg-info {
    font-size: 11px;
    color: var(--text-400);
  }

  .seg-selected {
    color: var(--text-300);
  }
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--surface-overlay);
  color: var(--text-300);
  transition: all 0.15s;

  &.active {
    background: var(--accent);
    color: white;
  }

  &:not(.active):hover {
    color: var(--text-100);
    background: var(--surface-border);
  }
}

.sep-line {
  width: 1px;
  height: 20px;
  background: var(--surface-border);
  margin: 0 2px;
}

.text-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-300);
  transition: all 0.15s;

  &:hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }
}

.timeline-placeholder {
  height: 64px;
  background: var(--surface-overlay);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.playback-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .playback-spacer { flex: 1; }
}

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover { background: var(--surface-border); }

  .play-icon { margin-left: 2px; }
}

.time-mono {
  font-size: 11px;
  font-family: 'Menlo', 'Consolas', monospace;
  color: var(--text-300);
  white-space: nowrap;

  &--dim { color: var(--text-400); }
}

.sep-char {
  color: var(--text-400);
  font-size: 11px;
}

.in-out-label {
  font-size: 11px;
  color: var(--text-400);
  margin-left: 6px;
}

.in-out-time {
  font-size: 11px;
  font-family: 'Menlo', 'Consolas', monospace;
  color: #fbbf24;
}

.icon-btn-sm {
  display: flex;
  align-items: center;
  color: var(--text-300);
  transition: color 0.15s;
  &:hover { color: var(--text-100); }
}

.volume-slider {
  width: 80px;
  accent-color: var(--accent);
  cursor: pointer;
}

.kbd-hints {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-400);

  kbd {
    font-family: 'Menlo', 'Consolas', monospace;
    background: var(--surface-overlay);
    padding: 1px 4px;
    border-radius: 3px;
    color: var(--text-300);
  }
}
</style>
