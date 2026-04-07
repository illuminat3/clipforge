<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { Segment } from '../services/clipService'

const props = defineProps<{
  duration: number
  segments: Segment[]
  selectedSeg: number | null
  currentTime: number
  tool: 'select' | 'razor'
}>()

const emit = defineEmits<{
  change: [segments: Segment[]]
  selectSeg: [idx: number | null]
  seek: [time: number]
}>()

const scrollRef = ref<HTMLDivElement | null>(null)
const trackRef = ref<HTMLDivElement | null>(null)
const zoom = ref(1)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const totalTimelineDur = computed(() =>
  Math.max(
    props.duration,
    props.segments.reduce((maxEnd, seg) => {
      const end = (seg.timelineOffset ?? 0) + (seg.end - seg.start)
      return Math.max(maxEnd, end)
    }, 0)
  )
)

const xToTimelineTime = (clientX: number): number | null => {
  const scroll = scrollRef.value
  if (!scroll) return null
  const rect = scroll.getBoundingClientRect()
  const frac = clamp((clientX - rect.left + scroll.scrollLeft) / scroll.scrollWidth, 0, 1)
  return frac * totalTimelineDur.value
}

const timelineTimeToSrcTime = (tlTime: number): number | null => {
  for (const seg of props.segments) {
    const tlStart = seg.timelineOffset ?? 0
    const dur = seg.end - seg.start
    if (tlTime >= tlStart && tlTime <= tlStart + dur) {
      return seg.start + (tlTime - tlStart)
    }
  }
  return null
}

const srcToTimelineTime = (srcTime: number): number | null => {
  for (const seg of props.segments) {
    if (srcTime >= seg.start && srcTime <= seg.end) {
      const tlStart = seg.timelineOffset ?? 0
      return tlStart + (srcTime - seg.start)
    }
  }
  return null
}

// ── Segment body drag (move timelineOffset) ────────────────────────────────
const handleBodyMouseDown = (idx: number, e: MouseEvent) => {
  e.stopPropagation()
  if (props.tool !== 'select') return
  emit('selectSeg', idx)

  const origOffset = props.segments[idx].timelineOffset ?? 0
  const startX = e.clientX

  const move = (ev: MouseEvent) => {
    const scroll = scrollRef.value
    if (!scroll) return
    const delta = ((ev.clientX - startX) / scroll.scrollWidth) * totalTimelineDur.value
    const newOffset = Math.max(0, origOffset + delta)
    emit('change', props.segments.map((s, i) => (i === idx ? { ...s, timelineOffset: newOffset } : s)))
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Left trim handle ────────────────────────────────────────────────────────
const handleLeftMouseDown = (idx: number, e: MouseEvent) => {
  e.stopPropagation()
  const { start: origStart, end, timelineOffset: origTLO = 0 } = props.segments[idx]
  const startX = e.clientX

  const move = (ev: MouseEvent) => {
    const scroll = scrollRef.value
    if (!scroll) return
    const delta = ((ev.clientX - startX) / scroll.scrollWidth) * totalTimelineDur.value
    const newStart = clamp(origStart + delta, 0, end - 0.05)
    const actualDelta = newStart - origStart
    const newTLO = Math.max(0, origTLO + actualDelta)
    emit('change', props.segments.map((s, i) => (i === idx ? { ...s, start: newStart, timelineOffset: newTLO } : s)))
    emit('seek', newStart)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Right trim handle ───────────────────────────────────────────────────────
const handleRightMouseDown = (idx: number, e: MouseEvent) => {
  e.stopPropagation()
  const { start, end: origEnd } = props.segments[idx]
  const startX = e.clientX

  const move = (ev: MouseEvent) => {
    const scroll = scrollRef.value
    if (!scroll) return
    const delta = ((ev.clientX - startX) / scroll.scrollWidth) * totalTimelineDur.value
    const newEnd = clamp(origEnd + delta, start + 0.05, props.duration)
    emit('change', props.segments.map((s, i) => (i === idx ? { ...s, end: newEnd } : s)))
    emit('seek', newEnd)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ── Segment click: razor or drag ────────────────────────────────────────────
const handleSegMouseDown = (idx: number, e: MouseEvent) => {
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
      ...props.segments.slice(idx + 1),
    ])
    emit('selectSeg', null)
  } else {
    handleBodyMouseDown(idx, e)
  }
}

// ── Track background click / seek ──────────────────────────────────────────
const handleTrackMouseDown = (e: MouseEvent) => {
  if (e.target !== trackRef.value) return
  emit('selectSeg', null)
  const tlTime = xToTimelineTime(e.clientX)
  if (tlTime === null) return
  const srcTime = timelineTimeToSrcTime(tlTime)
  if (srcTime !== null) emit('seek', srcTime)
}

// ── Playhead drag ───────────────────────────────────────────────────────────
const handlePlayheadMouseDown = (e: MouseEvent) => {
  e.stopPropagation()
  const doSeek = (ev: MouseEvent) => {
    const tlTime = xToTimelineTime(ev.clientX)
    if (tlTime === null) return
    const srcTime = timelineTimeToSrcTime(tlTime)
    if (srcTime !== null) emit('seek', srcTime)
  }
  doSeek(e)
  const onMove = (ev: MouseEvent) => doSeek(ev)
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Playhead position ───────────────────────────────────────────────────────
const playheadTLTime = computed(() => srcToTimelineTime(props.currentTime))
const playheadPct = computed(() =>
  playheadTLTime.value !== null
    ? (playheadTLTime.value / totalTimelineDur.value) * 100
    : null
)

// Auto-scroll to keep playhead visible
watch(playheadTLTime, (tlTime) => {
  if (tlTime === null || !scrollRef.value) return
  const scroll = scrollRef.value
  const playheadPx = (tlTime / totalTimelineDur.value) * scroll.scrollWidth
  const visibleLeft = scroll.scrollLeft
  const visibleRight = scroll.scrollLeft + scroll.clientWidth
  if (playheadPx < visibleLeft || playheadPx > visibleRight) {
    scroll.scrollLeft = Math.max(0, playheadPx - scroll.clientWidth * 0.3)
  }
})

// ── Zoom ────────────────────────────────────────────────────────────────────
const handleZoomIn = () => { zoom.value = Math.min(20, zoom.value * 1.5) }
const handleZoomOut = () => { zoom.value = Math.max(1, zoom.value / 1.5) }
const innerWidth = computed(() => `${zoom.value * 100}%`)

// ── Ruler ───────────────────────────────────────────────────────────────────
const pickStep = (d: number): number => {
  if (d <= 30) return 5
  if (d <= 120) return 15
  if (d <= 300) return 30
  if (d <= 600) return 60
  return 120
}

const formatRulerTime = (s: number): string => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (m === 0) return `${sec}s`
  if (sec === 0) return `${m}m`
  return `${m}:${String(sec).padStart(2, '0')}`
}

const rulerTicks = computed(() => {
  if (!totalTimelineDur.value) return []
  const step = pickStep(totalTimelineDur.value)
  const ticks: number[] = []
  for (let t = 0; t <= totalTimelineDur.value; t += step) ticks.push(t)
  return ticks
})

// ── Segment layout ──────────────────────────────────────────────────────────
const segmentLayouts = computed(() =>
  props.segments.map((seg) => {
    const tlStart = seg.timelineOffset ?? 0
    const dur = seg.end - seg.start
    const left = totalTimelineDur.value > 0 ? (tlStart / totalTimelineDur.value) * 100 : 0
    const width = totalTimelineDur.value > 0 ? (dur / totalTimelineDur.value) * 100 : 0
    return { left, width }
  })
)
</script>

<template>
  <div class="edit-timeline no-select">
    <!-- Zoom controls -->
    <div class="zoom-row">
      <span class="zoom-label">{{ zoom.toFixed(1) }}x</span>
      <button class="zoom-btn" title="Zoom out" @click="handleZoomOut">
        <ZoomOut :size="13" />
      </button>
      <button class="zoom-btn" title="Zoom in" @click="handleZoomIn">
        <ZoomIn :size="13" />
      </button>
    </div>

    <!-- Scrollable ruler + track -->
    <div ref="scrollRef" class="scroll-area">
      <!-- Ruler -->
      <div class="ruler" :style="{ width: innerWidth, minWidth: '100%' }">
        <div
          v-for="t in rulerTicks"
          :key="t"
          class="tick"
          :style="{ left: `${(t / totalTimelineDur) * 100}%` }"
        >
          <div class="tick-line" />
          <span>{{ formatRulerTime(t) }}</span>
        </div>
      </div>

      <!-- Track -->
      <div
        ref="trackRef"
        class="track"
        :style="{
          width: innerWidth,
          minWidth: '100%',
          cursor: tool === 'razor' ? 'crosshair' : 'default',
        }"
        @mousedown="handleTrackMouseDown"
      >
        <!-- Segments -->
        <div
          v-for="(seg, idx) in segments"
          :key="idx"
          class="seg-wrap"
          :style="{
            left: `${segmentLayouts[idx].left}%`,
            width: `${segmentLayouts[idx].width}%`,
            zIndex: selectedSeg === idx ? 5 : 3,
          }"
        >
          <div
            class="seg-body"
            :class="{ selected: selectedSeg === idx }"
            :style="{ cursor: tool === 'razor' ? 'crosshair' : 'grab' }"
            @mousedown="(e) => handleSegMouseDown(idx, e)"
          />
          <!-- Left handle -->
          <div class="trim-handle trim-handle--left" @mousedown="(e) => handleLeftMouseDown(idx, e)">
            <div class="grip">
              <div class="grip-line" />
              <div class="grip-line" />
            </div>
          </div>
          <!-- Right handle -->
          <div class="trim-handle trim-handle--right" @mousedown="(e) => handleRightMouseDown(idx, e)">
            <div class="grip">
              <div class="grip-line" />
              <div class="grip-line" />
            </div>
          </div>
        </div>

        <!-- Playhead -->
        <div
          v-if="playheadPct !== null"
          class="playhead"
          :style="{ left: `${playheadPct}%` }"
          @mousedown="handlePlayheadMouseDown"
        >
          <div class="playhead-arrow" />
          <div class="playhead-line" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.edit-timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zoom-row {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;

  .zoom-label {
    font-size: 11px;
    color: var(--text-400);
    margin-right: 2px;
  }

  .zoom-btn {
    padding: 2px;
    border-radius: 3px;
    color: var(--text-400);
    display: flex;
    align-items: center;
    transition: all 0.15s;

    &:hover {
      color: var(--text-100);
      background: var(--surface-overlay);
    }
  }
}

.scroll-area {
  overflow-x: auto;
  scrollbar-width: thin;
}

.ruler {
  position: relative;
  height: 20px;
  font-size: 11px;
  color: var(--text-400);

  .tick {
    position: absolute;
    top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateX(-50%);

    .tick-line {
      width: 1px;
      height: 6px;
      background: var(--text-400);
    }
  }
}

.track {
  position: relative;
  height: 48px;
  border-radius: 4px;
  background: var(--surface-overlay);
}

.seg-wrap {
  position: absolute;
  top: 0;
  height: 100%;

  .seg-body {
    position: absolute;
    inset: 0;
    background: #3a44a0;
    transition: background 0.15s;

    &.selected {
      background: #4d5fd4;
    }
  }

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
    transition: background 0.1s;

    &:hover { background: #fde047; }

    &--left  { left: 0;  border-radius: 4px 0 0 4px; }
    &--right { right: 0; border-radius: 0 4px 4px 0; }

    .grip {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .grip-line {
        width: 2px;
        height: 8px;
        background: #78350f;
        border-radius: 1px;
      }
    }
  }
}

.playhead {
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 20;
  cursor: ew-resize;
  transform: translateX(-50%);

  .playhead-arrow {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid white;
    margin: 0 auto;
  }

  .playhead-line {
    width: 1px;
    height: calc(100% - 8px);
    background: white;
    margin: 0 auto;
  }
}
</style>
