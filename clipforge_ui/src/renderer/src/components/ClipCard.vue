<template>
  <div
    class="clip-card"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @mouseleave="confirmDelete = false"
    @keydown.enter="$emit('click')"
  >
    <!-- Open file location -->
    <button
      v-if="clip.path"
      class="overlay-btn top-left"
      title="Open file location in Explorer"
      @click.stop="openLocation"
    >
      <FolderOpen :size="14" />
    </button>

    <!-- Delete button -->
    <button
      :class="['overlay-btn top-right', { danger: confirmDelete }]"
      :title="confirmDelete ? 'Click again to confirm delete' : 'Delete clip'"
      @click.stop="handleDelete"
    >
      <span v-if="confirmDelete" class="delete-label">Delete?</span>
      <Trash2 v-else :size="14" />
    </button>

    <!-- Thumbnail -->
    <div class="thumbnail">
      <img v-if="thumbnail" :src="thumbnail" :alt="displayName" class="thumb-img" />
      <Film v-else :size="32" class="thumb-placeholder" />

      <!-- Duration badge -->
      <span v-if="metadata?.duration" class="duration-badge">
        {{ formatDuration(metadata.duration) }}
      </span>

      <!-- Hover play overlay -->
      <div class="hover-overlay">
        <div class="play-circle">
          <div class="play-triangle" />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="clip-info">
      <p class="clip-name" :title="clip.name">{{ displayName }}</p>
      <div class="clip-meta">
        <span class="meta-date">{{ formatDate(clip.modifiedAt) }}</span>
        <span v-if="clip.size" class="meta-size">{{ formatSize(clip.size) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Film, Trash2, FolderOpen } from 'lucide-vue-next'
import type { LocalClipService, ClipMeta, ClipMetadata } from '@renderer/services/clipService'

defineOptions({ name: 'ClipCard' })

const props = defineProps<{
  clip: ClipMeta
  service: LocalClipService
}>()

const emit = defineEmits<{
  click: []
  delete: [id: string]
}>()

const thumbnail = ref<string | null>(null)
const metadata = ref<ClipMetadata | null>(null)
const confirmDelete = ref(false)

let cancelled = false

onMounted(() => {
  props.service.getThumbnail(props.clip.id).then((url) => {
    if (!cancelled) thumbnail.value = url
  })
  props.service.getClipDetails(props.clip.id).then((meta) => {
    if (!cancelled) metadata.value = meta
  })
})

onUnmounted(() => {
  cancelled = true
})

const displayName = computed(() => props.clip.name.replace(/\.[^.]+$/, ''))

function openLocation(): void {
  window.electronAPI?.clips?.openFileLocation(props.clip.path)
}

function handleDelete(): void {
  if (confirmDelete.value) {
    emit('delete', props.clip.id)
  } else {
    confirmDelete.value = true
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<style scoped>
.clip-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.clip-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Overlay buttons (shown on hover) */
.overlay-btn {
  position: absolute;
  z-index: 10;
  padding: 6px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s,
    color 0.15s;
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-secondary-text);
  display: flex;
  align-items: center;
}

.clip-card:hover .overlay-btn {
  opacity: 1;
}

.overlay-btn:hover {
  background: var(--color-surface-active);
  color: var(--color-primary-text);
}

.overlay-btn.danger {
  background: var(--color-error);
  color: #fff;
  opacity: 1;
}

.top-left {
  top: 8px;
  left: 8px;
}

.top-right {
  top: 8px;
  right: 8px;
}

.delete-label {
  font-size: 11px;
  font-weight: 600;
  padding: 0 2px;
}

/* Thumbnail */
.thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--color-surface-active);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.clip-card:hover .thumb-img {
  transform: scale(1.05);
}

.thumb-placeholder {
  color: var(--color-border);
}

.duration-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.clip-card:hover .hover-overlay {
  background: rgba(var(--color-accent), 0.08);
}

.play-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.clip-card:hover .play-circle {
  opacity: 1;
}

.play-triangle {
  width: 0;
  height: 0;
  margin-left: 3px;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-left: 12px solid rgba(255, 255, 255, 0.9);
}

/* Info */
.clip-info {
  padding: 10px 12px;
}

.clip-name {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clip-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.meta-date {
  font-size: 11px;
  color: var(--color-secondary-text);
}

.meta-size {
  font-size: 11px;
  color: var(--color-tertiary-text);
}
</style>
