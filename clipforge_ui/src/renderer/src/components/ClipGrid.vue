<script setup lang="ts">
import { RefreshCw, AlertCircle, Film } from 'lucide-vue-next'
import ClipCard from './ClipCard.vue'
import type { ClipMeta, ClipService } from '../services/clipService'

defineProps<{
  clips: ClipMeta[]
  loading: boolean
  error: string | null
  service: ClipService | null
  clipsDirectory?: string
}>()

const emit = defineEmits<{
  clipSelect: [clip: ClipMeta]
  refresh: []
  clipDelete: [clipId: string]
}>()
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="state-center">
    <div class="loading-row">
      <RefreshCw :size="20" class="spin" />
      <span>Loading clips...</span>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="state-center">
    <AlertCircle :size="48" class="error-icon" />
    <div class="error-body">
      <p class="error-title">Could not load clips</p>
      <p class="error-msg">{{ error }}</p>
      <p v-if="clipsDirectory" class="error-dir">
        Directory: <code>{{ clipsDirectory }}</code>
      </p>
    </div>
    <button class="retry-btn" @click="emit('refresh')">
      <RefreshCw :size="14" />
      Retry
    </button>
  </div>

  <!-- Empty -->
  <div v-else-if="clips.length === 0" class="state-center">
    <Film :size="64" class="empty-icon" stroke-width="1" />
    <div class="empty-body">
      <p class="empty-title">No clips found</p>
      <p class="empty-msg">
        Add video files to <code>{{ clipsDirectory }}</code>
      </p>
    </div>
    <button class="retry-btn" @click="emit('refresh')">
      <RefreshCw :size="14" />
      Refresh
    </button>
  </div>

  <!-- Grid -->
  <div v-else class="grid-layout">
    <div class="toolbar">
      <span class="clip-count">{{ clips.length }} {{ clips.length === 1 ? 'clip' : 'clips' }}</span>
      <button class="refresh-btn" @click="emit('refresh')">
        <RefreshCw :size="13" />
        Refresh
      </button>
    </div>

    <div class="grid-scroll">
      <div class="grid">
        <ClipCard
          v-for="clip in clips"
          :key="clip.id"
          :clip="clip"
          :service="service"
          @select="emit('clipSelect', clip)"
          @delete="emit('clipDelete', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.state-center {
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
  gap: 10px;
  color: var(--text-300);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.error-icon {
  color: #f87171;
  opacity: 0.7;
}

.error-body {
  .error-title {
    color: #f87171;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .error-msg {
    color: var(--text-300);
    font-size: 13px;
  }

  .error-dir {
    color: var(--text-400);
    font-size: 11px;
    margin-top: 8px;

    code {
      color: var(--text-300);
      background: var(--surface-overlay);
      padding: 1px 4px;
      border-radius: 3px;
    }
  }
}

.empty-icon {
  color: var(--text-400);
  opacity: 0.3;
}

.empty-body {
  .empty-title {
    color: var(--text-200);
    font-weight: 500;
  }

  .empty-msg {
    color: var(--text-300);
    font-size: 13px;
    margin-top: 4px;

    code {
      color: var(--text-200);
      background: var(--surface-overlay);
      padding: 1px 4px;
      border-radius: 3px;
    }
  }
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 4px;
  background: var(--surface-overlay);
  color: var(--text-200);
  font-size: 13px;
  transition: background 0.15s;

  &:hover {
    background: var(--surface-border);
  }
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
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;

  .clip-count {
    font-size: 12px;
    color: var(--text-300);
  }

  .refresh-btn {
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
}

.grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
</style>
