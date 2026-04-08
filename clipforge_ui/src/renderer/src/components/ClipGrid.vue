<template>
  <!-- Loading -->
  <div v-if="loading" class="center-state">
    <div class="loading-row">
      <RefreshCw :size="20" class="animate-spin muted-icon" />
      <span class="muted-text">Loading clips...</span>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="center-state">
    <AlertCircle :size="48" class="error-icon" />
    <div class="state-text">
      <p class="error-msg">Could not load clips</p>
      <p class="muted-text small">{{ error }}</p>
      <p v-if="clipsDirectory" class="dim-text tiny">
        Directory: <code>{{ clipsDirectory }}</code>
      </p>
    </div>
    <button class="ghost-btn" @click="$emit('refresh')">
      <RefreshCw :size="14" />
      Retry
    </button>
  </div>

  <!-- Empty -->
  <div v-else-if="clips.length === 0" class="center-state">
    <Film :size="64" stroke-width="1" class="empty-icon" />
    <div class="state-text center">
      <p class="secondary-text">No clips found</p>
      <p class="dim-text small">
        Add video files to <code>{{ clipsDirectory }}</code>
      </p>
    </div>
    <button class="ghost-btn" @click="$emit('refresh')">
      <RefreshCw :size="14" />
      Refresh
    </button>
  </div>

  <!-- Grid -->
  <div v-else class="grid-layout">
    <div class="toolbar">
      <span class="muted-text small">{{ clips.length }} {{ clips.length === 1 ? 'clip' : 'clips' }}</span>
      <button class="ghost-btn small" @click="$emit('refresh')">
        <RefreshCw :size="13" />
        Refresh
      </button>
    </div>
    <div class="clip-grid-scroll">
      <div class="clip-grid">
        <ClipCard
          v-for="clip in clips"
          :key="clip.id"
          :clip="clip"
          :service="service"
          @click="$emit('clip-select', clip)"
          @delete="$emit('clip-delete', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Film, RefreshCw, AlertCircle } from 'lucide-vue-next'
import type { LocalClipService, ClipMeta } from '@renderer/services/clipService'
import ClipCard from './ClipCard.vue'

defineOptions({ name: 'ClipGrid' })

defineProps<{
  clips: ClipMeta[]
  loading: boolean
  error: string | null
  service: LocalClipService
  clipsDirectory?: string
}>()

defineEmits<{
  'clip-select': [clip: ClipMeta]
  refresh: []
  'clip-delete': [id: string]
}>()
</script>

<style scoped>
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.muted-icon {
  color: var(--color-secondary-text);
}

.error-icon {
  color: var(--color-error);
  opacity: 0.7;
}

.empty-icon {
  color: var(--color-border);
  opacity: 0.3;
}

.muted-text {
  color: var(--color-secondary-text);
}

.dim-text {
  color: var(--color-tertiary-text);
}

.secondary-text {
  color: var(--color-primary-text);
  font-weight: 500;
}

.error-msg {
  color: var(--color-error);
  font-weight: 500;
  margin: 0 0 4px;
}

.state-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.state-text p {
  margin: 0;
}

.small {
  font-size: 13px;
}

.tiny {
  font-size: 11px;
}

code {
  color: var(--color-secondary-text);
}

.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 4px;
  border: none;
  background: var(--color-surface-active);
  color: var(--color-secondary-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ghost-btn:hover {
  background: var(--color-border);
  color: var(--color-primary-text);
}

.ghost-btn.small {
  padding: 4px 10px;
  font-size: 12px;
}

.grid-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.clip-grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.clip-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
</style>
