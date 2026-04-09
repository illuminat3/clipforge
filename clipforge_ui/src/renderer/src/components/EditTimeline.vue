<template>
  <div class="timeline-wrap no-select">
    <!-- Zoom controls -->
    <div class="zoom-row">
      <span class="zoom-label">{{ zoom.toFixed(1) }}x</span>
      <button class="zoom-btn" title="Zoom out" @click="zoom = Math.max(1, zoom / 1.5)">
        <ZoomOut :size="13" />
      </button>
      <button class="zoom-btn" title="Zoom in" @click="zoom = Math.min(20, zoom * 1.5)">
        <ZoomIn :size="13" />
      </button>
    </div>

    <!-- Scrollable area -->
    <div ref="scrollEl" class="scroll-area">
      <!-- Ruler -->
      <div :style="innerStyle">
        <div class="ruler">
          <div
            v-for="t in rulerTicks"
            :key="t"
            class="tick"
            :style="{ left: `${(t / totalTimelineDur) * 100}%` }"
          >
            <div class="tick-mark" />
            <span class="tick-label">{{ formatRulerTime(t) }}</span>
          </div>
        </div>
      </div>

      <!-- Track -->
      <div
        ref="trackEl"
        class="track"
        :style="{ ...innerStyle, cursor: tool === 'razor' ? 'crosshair' : 'default' }"
        @mousedown="handleTrackMouseDown"
      >
        <!-- Segments -->
        <div
          v-for="(seg, idx) in segments"
          :key="idx"
          class="seg-wrapper"
          :style="segStyle(seg, idx)"
        >
          <!-- Clip body -->
          <div
            :class="['seg-body', { selected: selectedSeg === idx }]"
            :style="{ cursor: tool === 'razor' ? 'crosshair' : 'grab' }"
            @mousedown="(e) => handleSegMouseDown(idx, e)"
          />

          <!-- Left trim handle -->
          <div class="trim-handle left" @mousedown.stop="(e) => handleLeftMouseDown(idx, e)">
            <div class="handle-lines">
              <div class="h-line" />
              <div class="h-line" />
            </div>
          </div>

          <!-- Right trim handle -->
          <div class="trim-handle right" @mousedown.stop="(e) => handleRightMouseDown(idx, e)">
            <div class="handle-lines">
              <div class="h-line" />
              <div class="h-line" />
            </div>
          </div>
        </div>

        <!-- Playhead -->
        <div
          v-if="playheadPct !== null"
          class="playhead"
          :style="{ left: `${playheadPct}%` }"
          @mousedown.stop="handlePlayheadMouseDown"
        >
          <div class="playhead-arrow" />
          <div class="playhead-line" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { EditSegment } from '@renderer/services/clipService'

defineOptions({ name: 'EditTimeline' })

const props = defineProps<{
  duration: number
  segments: EditSegment[]
  selectedSeg: number | null
  currentTime: number
  tool: 'select' | 'razor'
}>()

const emit = defineEmits<{
  change: [segments: EditSegment[]]
  'select-seg': [index: number | null]
  seek: [time: number]
}>()

const scrollEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const zoom = ref(1)

// Keep a mutable ref for use inside mousedown closures
let segsSnapshot: EditSegment[] = props.segments
watch(
  () => props.segments,
  (v) => {
    segsSnapshot = v
  },
  { deep: true, immediate: true }
)

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

const totalTimelineDur = computed(() =>
  Math.max(
    props.duration,
    props.segments.reduce((max, seg) => {
      const end = (seg.timelineOffset ?? 0) + (seg.end - seg.start)
      return Math.max(max, end)
    }, 0)
  )
)

const innerStyle = computed(() => ({
  width: `${zoom.value * 100}%`,
  minWidth: '100%'
}))

// Ruler ticks
const rulerTicks = computed(() => {
  const d = totalTimelineDur.value
  const step = pickStep(d)
  const ticks: number[] = []
  for (let t = 0; t <= d; t += step) ticks.push(t)
  return ticks
})

function xToTimelineTime(clientX: number): number | null {
  const el = scrollEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const frac = clamp((clientX - rect.left + el.scrollLeft) / el.scrollWidth, 0, 1)
  return frac * totalTimelineDur.value
}

function timelineTimeToSrcTime(tlTime: number): number | null {
  for (const seg of props.segments) {
    const tlStart = seg.timelineOffset ?? 0
    const dur = seg.end - seg.start
    if (tlTime >= tlStart && tlTime <= tlStart + dur) {
      return seg.start + (tlTime - tlStart)
    }
  }
  return null
}

function srcToTimelineTime(srcTime: number): number | null {
  for (const seg of props.segments) {
    if (srcTime >= seg.start && srcTime <= seg.end) {
      const tlStart = seg.timelineOffset ?? 0
      return tlStart + (srcTime - seg.start)
    }
  }
  return null
}

// Segment style
function segStyle(seg: EditSegment, idx: number): CSSProperties {
  const tlStart = seg.timelineOffset ?? 0
  const dur = seg.end - seg.start
  const left = totalTimelineDur.value > 0 ? (tlStart / totalTimelineDur.value) * 100 : 0
  const width = totalTimelineDur.value > 0 ? (dur / totalTimelineDur.value) * 100 : 0
  return {
    position: 'absolute',
    top: '0',
    height: '100%',
    left: `${left}%`,
    width: `${width}%`,
    zIndex: props.selectedSeg === idx ? 5 : 3
  }
}

// ── Drag: body ────────────────────────────────────────────────────────────────
function handleBodyMouseDown(idx: number, e: MouseEvent): void {
  e.stopPropagation()
  if (props.tool !== 'select') return
  emit('select-seg', idx)

  const origOffset = segsSnapshot[idx].timelineOffset ?? 0
  const startX = e.clientX

  const move = (ev: MouseEvent): void => {
    const el = scrollEl.value
    if (!el) return
    const delta = ((ev.clientX - startX) / el.scrollWidth) * totalTimelineDur.value
    const newOffset = Math.max(0, origOffset + delta)
    emit(
      'change',
      segsSnapshot.map((s, i) => (i === idx ? { ...s, timelineOffset: newOffset } : s))
    )
  }
  const up = (): void => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Drag: left trim ───────────────────────────────────────────────────────────
function handleLeftMouseDown(idx: number, e: MouseEvent): void {
  e.stopPropagation()
  const { start: origStart, end, timelineOffset: origTLO = 0 } = segsSnapshot[idx]
  const startX = e.clientX

  const move = (ev: MouseEvent): void => {
    const el = scrollEl.value
    if (!el) return
    const delta = ((ev.clientX - startX) / el.scrollWidth) * totalTimelineDur.value
    const newStart = clamp(origStart + delta, 0, end - 0.05)
    const actualDelta = newStart - origStart
    const newTLO = Math.max(0, origTLO + actualDelta)
    emit(
      'change',
      segsSnapshot.map((s, i) =>
        i === idx ? { ...s, start: newStart, timelineOffset: newTLO } : s
      )
    )
    emit('seek', newStart)
  }
  const up = (): void => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Drag: right trim ──────────────────────────────────────────────────────────
function handleRightMouseDown(idx: number, e: MouseEvent): void {
  e.stopPropagation()
  const { start, end: origEnd } = segsSnapshot[idx]
  const startX = e.clientX

  const move = (ev: MouseEvent): void => {
    const el = scrollEl.value
    if (!el) return
    const delta = ((ev.clientX - startX) / el.scrollWidth) * totalTimelineDur.value
    const newEnd = clamp(origEnd + delta, start + 0.05, props.duration)
    emit(
      'change',
      segsSnapshot.map((s, i) => (i === idx ? { ...s, end: newEnd } : s))
    )
    emit('seek', newEnd)
  }
  const up = (): void => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Segment click/drag ────────────────────────────────────────────────────────
function handleSegMouseDown(idx: number, e: MouseEvent): void {
  e.stopPropagation()
  if (props.tool === 'razor') {
    const tlTime = xToTimelineTime(e.clientX)
    if (tlTime === null) return
    const seg = props.segments[idx]
    const tlStart = seg.timelineOffset ?? 0
    const offsetInSeg = tlTime - tlStart
    const dur = seg.end - seg.start
    if (offsetInSeg <= 0.05 || offsetInSeg >= dur - 0.05) return
    const cutAt = seg.start + offsetInSeg
    emit('change', [
      ...props.segments.slice(0, idx),
      { start: seg.start, end: cutAt, timelineOffset: tlStart },
      { start: cutAt, end: seg.end, timelineOffset: tlStart + offsetInSeg },
      ...props.segments.slice(idx + 1)
    ])
    emit('select-seg', null)
  } else {
    handleBodyMouseDown(idx, e)
  }
}

// ── Track background click ────────────────────────────────────────────────────
function handleTrackMouseDown(e: MouseEvent): void {
  if (e.target !== trackEl.value) return
  emit('select-seg', null)
  const tlTime = xToTimelineTime(e.clientX)
  if (tlTime === null) return
  const srcTime = timelineTimeToSrcTime(tlTime)
  if (srcTime !== null) emit('seek', srcTime)
}

// ── Playhead drag ─────────────────────────────────────────────────────────────
function handlePlayheadMouseDown(e: MouseEvent): void {
  const doSeek = (ev: MouseEvent): void => {
    const tlTime = xToTimelineTime(ev.clientX)
    if (tlTime === null) return
    const srcTime = timelineTimeToSrcTime(tlTime)
    if (srcTime !== null) emit('seek', srcTime)
  }
  doSeek(e)
  const onMove = (ev: MouseEvent): void => doSeek(ev)
  const onUp = (): void => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// Playhead position
const playheadTLTime = computed(() => srcToTimelineTime(props.currentTime))
const playheadPct = computed(() =>
  playheadTLTime.value !== null ? (playheadTLTime.value / totalTimelineDur.value) * 100 : null
)

// Auto-scroll to keep playhead visible
watch(playheadTLTime, (tlTime) => {
  if (tlTime === null || !scrollEl.value) return
  const el = scrollEl.value
  const px = (tlTime / totalTimelineDur.value) * el.scrollWidth
  if (px < el.scrollLeft || px > el.scrollLeft + el.clientWidth) {
    el.scrollLeft = Math.max(0, px - el.clientWidth * 0.3)
  }
})

// Helpers
function pickStep(d: number): number {
  if (d <= 30) return 5
  if (d <= 120) return 15
  if (d <= 300) return 30
  if (d <= 600) return 60
  return 120
}

function formatRulerTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (m === 0) return `${sec}s`
  if (sec === 0) return `${m}m`
  return `${m}:${String(sec).padStart(2, '0')}`
}
</script>

<style scoped>
.timeline-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.no-select {
  user-select: none;
  -webkit-user-select: none;
}

.zoom-row {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.zoom-label {
  font-size: 11px;
  color: var(--color-tertiary-text);
  margin-right: 2px;
}

.zoom-btn {
  padding: 2px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: var(--color-tertiary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    background 0.15s;
}

.zoom-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.scroll-area {
  overflow-x: auto;
  scrollbar-width: thin;
}

/* Ruler */
.ruler {
  position: relative;
  height: 20px;
  font-size: 11px;
  color: var(--color-tertiary-text);
}

.tick {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.tick-mark {
  width: 1px;
  height: 6px;
  background: var(--color-border);
}

.tick-label {
  font-size: 10px;
  white-space: nowrap;
}

/* Track */
.track {
  position: relative;
  height: 48px;
  border-radius: 4px;
  background: var(--color-surface-active);
}

/* Segment */
.seg-wrapper {
  position: absolute;
  top: 0;
  height: 100%;
}

.seg-body {
  position: absolute;
  inset: 0;
  background: #4338ca; /* indigo-700 */
  transition: background 0.15s;
}

.seg-body.selected {
  background: #6366f1; /* indigo-500 */
}

/* Trim handles */
.trim-handle {
  position: absolute;
  top: 0;
  height: 100%;
  width: 10px;
  background: #facc15;
  cursor: ew-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.trim-handle:hover {
  background: #fde047;
}

.trim-handle.left {
  left: 0;
  border-radius: 3px 0 0 3px;
}

.trim-handle.right {
  right: 0;
  border-radius: 0 3px 3px 0;
}

.handle-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.h-line {
  width: 2px;
  height: 8px;
  background: #854d0e;
  border-radius: 1px;
}

/* Playhead */
.playhead {
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 20;
  cursor: ew-resize;
  transform: translateX(-50%);
}

.playhead-arrow {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #fff;
}

.playhead-line {
  width: 1px;
  height: calc(100% - 8px);
  background: #fff;
  margin: 0 auto;
}
</style>
