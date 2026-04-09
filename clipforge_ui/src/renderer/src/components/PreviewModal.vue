<template>
  <EditMode
    v-if="mode === 'edit'"
    :clip="previewClip"
    :service="service"
    :output-directory="outputDirectory"
    @back="mode = 'preview'"
    @close="$emit('close')"
    @saved="handleSaved"
  />

  <div v-else class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title" :title="clip.name">{{ displayName }}</h2>
        <div class="header-actions">
          <button disabled class="action-btn muted" title="Coming soon – publish to server">
            <Upload :size="14" />
            Publish
          </button>
          <button class="action-btn accent" @click="mode = 'edit'">
            <Pencil :size="14" />
            Edit
          </button>
          <button class="icon-btn" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>
      </div>

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

        <div v-if="loadingNewClip" class="loading-overlay">
          <div class="spinner" />
          <span class="loading-text">Loading saved clip...</span>
        </div>
      </div>

      <div class="controls-bar">
        <div ref="timelineEl" class="scrubber" @mousedown="handleTimelineMouseDown">
          <div class="scrubber-progress" :style="{ width: `${progress}%` }" />
          <div class="scrubber-thumb" :style="{ left: `calc(${progress}% - 6px)` }" />
        </div>

        <div class="controls-row">
          <button class="ctrl-btn round" @click="togglePlay">
            <Pause v-if="isPlaying" :size="15" />
            <Play v-else :size="15" style="margin-left: 2px" />
          </button>
          <span class="time-display"
            >{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span
          >

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
          <button class="ctrl-icon" title="Fullscreen" @click="handleFullscreen">
            <Maximize :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, Pencil, Upload, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-vue-next'
import type { LocalClipService, ClipMeta } from '@renderer/services/clipService'
import EditMode from './EditMode.vue'

defineOptions({ name: 'PreviewModal' })

const props = defineProps<{
  clip: ClipMeta
  service: LocalClipService
  outputDirectory: string
}>()

const emit = defineEmits<{
  close: []
  'saved-clip': [path: string]
}>()

const mode = ref<'preview' | 'edit'>('preview')
const previewClip = ref<ClipMeta>({ ...props.clip })
const loadingNewClip = ref(false)

const videoEl = ref<HTMLVideoElement | null>(null)
const timelineEl = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const muted = ref(false)
const volume = ref(1)

const videoSrc = computed(() => {
  const p = previewClip.value.path
  if (!p) return null
  return `file:///${p.replace(/\\/g, '/')}`
})

const displayName = computed(() => previewClip.value.name.replace(/\.[^.]+$/, ''))
const progress = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
)

function togglePlay(): void {
  const v = videoEl.value
  if (!v) return
  if (v.paused) v.play()
  else v.pause()
}

function handleTimeUpdate(): void {
  if (!isDragging.value && videoEl.value) {
    currentTime.value = videoEl.value.currentTime
  }
}

function handleLoadedMetadata(): void {
  if (videoEl.value) {
    duration.value = videoEl.value.duration
    loadingNewClip.value = false
  }
}

function handleFullscreen(): void {
  const v = videoEl.value
  if (!v) return
  if (v.requestFullscreen) v.requestFullscreen()
}

function seekTo(e: MouseEvent): void {
  const el = timelineEl.value
  if (!el || !duration.value) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const t = ratio * duration.value
  currentTime.value = t
  if (videoEl.value) videoEl.value.currentTime = t
}

function handleTimelineMouseDown(e: MouseEvent): void {
  isDragging.value = true
  seekTo(e)
  const onMove = (ev: MouseEvent): void => seekTo(ev)
  const onUp = (): void => {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function handleVolumeInput(e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  volume.value = v
  muted.value = v === 0
  if (videoEl.value) videoEl.value.volume = v
}

function handleSaved(outputPath: string): void {
  const fileName = outputPath.replace(/\\/g, '/').split('/').pop() ?? outputPath
  previewClip.value = { ...previewClip.value, path: outputPath, name: fileName, id: outputPath }
  mode.value = 'preview'
  loadingNewClip.value = true
  emit('saved-clip', outputPath)
}

function onKey(e: KeyboardEvent): void {
  if (mode.value === 'edit') return
  if ((e.target as HTMLElement).tagName === 'INPUT') return
  if (e.code === 'Space') {
    e.preventDefault()
    togglePlay()
  }
  if (e.code === 'Escape') emit('close')
  if (e.code === 'ArrowRight' && videoEl.value) videoEl.value.currentTime += 5
  if (e.code === 'ArrowLeft' && videoEl.value) videoEl.value.currentTime -= 5
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.modal-box {
  display: flex;
  flex-direction: column;
  background: var(--color-primary-background);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  margin: 0 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 500px;
}

.header-actions {
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

.video-area {
  position: relative;
  background: #000;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 13px;
  color: var(--color-secondary-text);
}

.controls-bar {
  padding: 12px 16px;
  background: var(--color-secondary-background);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.scrubber {
  position: relative;
  height: 8px;
  background: var(--color-surface-active);
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 12px;
}

.scrubber:hover .scrubber-thumb {
  opacity: 1;
}

.scrubber-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  pointer-events: none;
}

.scrubber-thumb {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
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
}

.ctrl-btn.round:hover {
  background: var(--color-border);
}

.time-display {
  font-size: 12px;
  font-family: monospace;
  color: var(--color-secondary-text);
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.ctrl-icon {
  border: none;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  padding: 2px;
}

.ctrl-icon:hover {
  color: var(--color-primary-text);
}

.volume-slider {
  width: 80px;
  accent-color: var(--color-accent);
}
</style>
