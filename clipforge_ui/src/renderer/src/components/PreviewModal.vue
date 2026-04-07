<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, Pencil, Upload, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-vue-next'
import EditMode from './EditMode.vue'
import type { ClipMeta, ClipService } from '../services/clipService'

const props = defineProps<{
  clip: ClipMeta
  service: ClipService
  outputDirectory?: string
}>()

const emit = defineEmits<{
  close: []
  savedClip: []
}>()

const mode = ref<'preview' | 'edit'>('preview')
const previewClip = ref<ClipMeta>({ ...props.clip })
const loadingNewClip = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const muted = ref(false)
const volume = ref(1)

const videoRef = ref<HTMLVideoElement | null>(null)
const timelineRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)

const videoSrc = computed(() =>
  previewClip.value.path
    ? `file:///${previewClip.value.path.replace(/\\/g, '/')}`
    : null
)

const progress = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
)

const handleSaved = (outputPath: string) => {
  const fileName = outputPath.replace(/\\/g, '/').split('/').pop() || outputPath
  previewClip.value = { ...previewClip.value, path: outputPath, name: fileName, id: outputPath }
  mode.value = 'preview'
  loadingNewClip.value = true
  emit('savedClip')
}

const togglePlay = () => {
  const v = videoRef.value
  if (!v) return
  if (v.paused) v.play()
  else v.pause()
}

const handleTimeUpdate = () => {
  if (!isDragging.value && videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const handleLoadedMetadata = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
    loadingNewClip.value = false
  }
}

const seekTo = (e: MouseEvent) => {
  const tl = timelineRef.value
  if (!tl) return
  const rect = tl.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const time = ratio * duration.value
  currentTime.value = time
  if (videoRef.value) videoRef.value.currentTime = time
}

const handleTimelineMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  seekTo(e)
  const onMove = (ev: MouseEvent) => seekTo(ev)
  const onUp = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const handleFullscreen = () => {
  const v = videoRef.value
  if (!v) return
  if (v.requestFullscreen) v.requestFullscreen()
}

const formatTime = (s: number): string => {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

const onKey = (e: KeyboardEvent) => {
  if (mode.value === 'edit') return
  if ((e.target as HTMLElement).tagName === 'INPUT') return
  if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  if (e.code === 'Escape') emit('close')
  if (e.code === 'ArrowRight' && videoRef.value) videoRef.value.currentTime += 5
  if (e.code === 'ArrowLeft' && videoRef.value) videoRef.value.currentTime -= 5
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="mode === 'edit'">
    <EditMode
      :clip="previewClip"
      :service="service"
      :output-directory="outputDirectory"
      @back="mode = 'preview'"
      @close="emit('close')"
      @saved="handleSaved"
    />
  </div>

  <div v-else class="modal-backdrop">
    <div class="modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="clip-title" :title="clip.name">
          {{ previewClip.name.replace(/\.[^.]+$/, '') }}
        </h2>
        <div class="header-actions">
          <button class="action-btn action-btn--disabled" disabled title="Coming soon – publish to server">
            <Upload :size="14" />
            Publish
          </button>
          <button class="action-btn action-btn--accent" @click="mode = 'edit'">
            <Pencil :size="14" />
            Edit
          </button>
          <button class="icon-btn" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>
      </div>

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

        <div v-if="loadingNewClip" class="loading-overlay">
          <div class="spinner" />
          <span>Loading saved clip...</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <div
          ref="timelineRef"
          class="timeline"
          @mousedown="handleTimelineMouseDown"
        >
          <div class="timeline-progress" :style="{ width: `${progress}%` }" />
          <div class="timeline-thumb" :style="{ left: `calc(${progress}% - 6px)` }" />
        </div>

        <div class="controls-row">
          <button class="play-btn" @click="togglePlay">
            <Pause v-if="isPlaying" :size="15" />
            <Play v-else :size="15" class="play-icon" />
          </button>

          <span class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>

          <div class="spacer" />

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
          <button class="icon-btn-sm" title="Fullscreen" @click="handleFullscreen">
            <Maximize :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.modal {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 900px;
  margin: 0 16px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  gap: 12px;
}

.clip-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-100);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
}

.header-actions {
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

.video-area {
  position: relative;
  background: black;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  .video-el {
    max-height: 100%;
    max-width: 100%;
    cursor: pointer;
  }

  .no-video {
    color: var(--text-400);
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
    color: var(--text-200);
    font-size: 13px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--accent);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.controls {
  padding: 12px 16px;
  background: var(--surface-raised);
  border-top: 1px solid var(--surface-border);
  flex-shrink: 0;
}

.timeline {
  position: relative;
  height: 8px;
  background: var(--surface-overlay);
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 12px;

  &:hover .timeline-thumb {
    opacity: 1;
  }

  .timeline-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
  }

  .timeline-thumb {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity 0.15s;
  }
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
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

.time-display {
  font-size: 12px;
  font-family: 'Menlo', 'Consolas', monospace;
  color: var(--text-300);
  white-space: nowrap;
  tabular-nums: all;
}

.spacer { flex: 1; }

.icon-btn-sm {
  display: flex;
  align-items: center;
  color: var(--text-300);
  transition: color 0.15s;
  padding: 2px;

  &:hover { color: var(--text-100); }
}

.volume-slider {
  width: 80px;
  accent-color: var(--accent);
  cursor: pointer;
}
</style>
