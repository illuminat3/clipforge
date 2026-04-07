<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Film, Trash2, FolderOpen } from 'lucide-vue-next'
import type { ClipMeta, ClipService, ClipDetail } from '../services/clipService'

const props = defineProps<{
  clip: ClipMeta
  service: ClipService | null
}>()

const emit = defineEmits<{
  select: []
  delete: [clipId: string]
}>()

const thumbnail = ref<string | null>(null)
const metadata = ref<ClipDetail | null>(null)
const confirmDelete = ref(false)

let cancelled = false

onMounted(() => {
  if (!props.service) return
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

const name = props.clip.name.replace(/\.[^.]+$/, '')

const handleDeleteClick = (e: MouseEvent) => {
  e.stopPropagation()
  if (confirmDelete.value) {
    emit('delete', props.clip.id)
  } else {
    confirmDelete.value = true
  }
}

const handleOpenLocation = (e: MouseEvent) => {
  e.stopPropagation()
  if (props.clip.path) {
    window.electronAPI?.clips.openFileLocation(props.clip.path)
  }
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatDate = (iso?: string): string => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<template>
  <div
    class="clip-card"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @mouseleave="confirmDelete = false"
    @keydown.enter="emit('select')"
  >
    <!-- Open file location -->
    <button
      v-if="clip.path"
      class="corner-btn corner-btn--left"
      title="Open file location in Explorer"
      @click="handleOpenLocation"
    >
      <FolderOpen :size="14" />
    </button>

    <!-- Delete -->
    <button
      class="corner-btn corner-btn--right"
      :class="{ 'confirm-mode': confirmDelete }"
      :title="confirmDelete ? 'Click again to confirm delete' : 'Delete clip'"
      @click="handleDeleteClick"
    >
      <span v-if="confirmDelete" class="confirm-text">Delete?</span>
      <Trash2 v-else :size="14" />
    </button>

    <!-- Thumbnail -->
    <div class="thumbnail">
      <img v-if="thumbnail" :src="thumbnail" :alt="name" class="thumb-img" />
      <Film v-else :size="32" class="thumb-placeholder" />

      <span v-if="metadata?.duration" class="duration-badge">
        {{ formatDuration(metadata.duration) }}
      </span>

      <div class="thumb-overlay">
        <div class="play-btn">
          <div class="play-triangle" />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="info">
      <p class="clip-name" :title="clip.name">{{ name }}</p>
      <div class="meta-row">
        <span class="meta-date">{{ formatDate(clip.modifiedAt) }}</span>
        <span v-if="clip.size" class="meta-size">{{ formatSize(clip.size) }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.clip-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

    .corner-btn {
      opacity: 1;
    }

    .thumb-overlay {
      background: rgba(74, 85, 224, 0.1);

      .play-btn {
        opacity: 1;
      }
    }

    .thumb-img {
      transform: scale(1.05);
    }
  }
}

.corner-btn {
  position: absolute;
  top: 8px;
  z-index: 10;
  padding: 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--text-300);
  opacity: 0;
  transition: all 0.15s;
  display: flex;
  align-items: center;

  &--left { left: 8px; }
  &--right { right: 8px; }

  &:hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }

  &.confirm-mode {
    background: #ef4444;
    color: white;
    opacity: 1;

    &:hover {
      background: #dc2626;
    }
  }

  .confirm-text {
    font-size: 11px;
    font-weight: 500;
    padding: 0 2px;
  }
}

.thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }

  .thumb-placeholder {
    color: var(--text-400);
  }

  .duration-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 11px;
    font-family: 'Menlo', 'Consolas', monospace;
    background: rgba(0, 0, 0, 0.7);
    color: white;
  }

  .thumb-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;

    .play-btn {
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

      .play-triangle {
        width: 0;
        height: 0;
        border-top: 7px solid transparent;
        border-bottom: 7px solid transparent;
        border-left: 12px solid white;
        margin-left: 3px;
      }
    }
  }
}

.info {
  padding: 10px 12px;

  .clip-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-200);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;

    .meta-date {
      font-size: 11px;
      color: var(--text-300);
    }

    .meta-size {
      font-size: 11px;
      color: var(--text-400);
    }
  }
}
</style>
