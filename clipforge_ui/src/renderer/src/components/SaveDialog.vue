<script setup lang="ts">
import { Save, Copy, FolderOpen, X, AlertCircle, Loader2 } from 'lucide-vue-next'

defineProps<{
  clipName: string
  saving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  save: [mode: 'overwrite' | 'copy' | 'browse']
  close: []
}>()
</script>

<template>
  <div class="backdrop">
    <div class="dialog">
      <div class="dialog-header">
        <h3 class="dialog-title">Save Clip</h3>
        <button :disabled="saving" class="close-btn" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <p class="dialog-desc">
        How would you like to save
        <span class="clip-name-highlight">{{ clipName }}</span>?
      </p>

      <div v-if="error" class="error-banner">
        <AlertCircle :size="15" class="error-icon" />
        <span>{{ error }}</span>
      </div>

      <div class="options">
        <button
          class="option option--danger"
          :disabled="saving"
          @click="emit('save', 'overwrite')"
        >
          <span class="option-icon">
            <Loader2 v-if="saving" :size="18" class="spin" />
            <Save v-else :size="18" />
          </span>
          <div class="option-text">
            <p class="option-title">Overwrite</p>
            <p class="option-desc">Replace the original file with the edited version</p>
          </div>
        </button>

        <button
          class="option option--primary"
          :disabled="saving"
          @click="emit('save', 'copy')"
        >
          <span class="option-icon option-icon--accent">
            <Loader2 v-if="saving" :size="18" class="spin" />
            <Copy v-else :size="18" />
          </span>
          <div class="option-text">
            <p class="option-title">Save as Copy</p>
            <p class="option-desc">Save to Output folder as clip_timestamp.mp4</p>
          </div>
        </button>

        <button
          class="option option--secondary"
          :disabled="saving"
          @click="emit('save', 'browse')"
        >
          <span class="option-icon option-icon--muted">
            <Loader2 v-if="saving" :size="18" class="spin" />
            <FolderOpen v-else :size="18" />
          </span>
          <div class="option-text">
            <p class="option-title">Choose Location</p>
            <p class="option-desc">Pick where to save — named clip_timestamp.mp4</p>
          </div>
        </button>
      </div>

      <button class="cancel-text" :disabled="saving" @click="emit('close')">
        Cancel
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.dialog {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 340px;
  margin: 0 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .dialog-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-100);
  }

  .close-btn {
    color: var(--text-300);
    display: flex;
    align-items: center;
    transition: color 0.15s;
    &:hover { color: var(--text-100); }
    &:disabled { cursor: not-allowed; }
  }
}

.dialog-desc {
  font-size: 13px;
  color: var(--text-300);
  margin: 0;

  .clip-name-highlight {
    color: var(--text-200);
    font-weight: 500;
  }
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(185, 28, 28, 0.2);
  border: 1px solid rgba(185, 28, 28, 0.4);
  font-size: 13px;
  color: #fca5a5;

  .error-icon { flex-shrink: 0; margin-top: 1px; }
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  text-align: left;
  transition: all 0.15s;
  color: var(--text-200);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary:not(:disabled):hover {
    border-color: var(--accent);
    background: rgba(74, 85, 224, 0.1);
  }

  &--danger:not(:disabled):hover {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  &--secondary:not(:disabled):hover {
    border-color: var(--text-300);
    background: var(--surface-overlay);
  }

  .option-icon {
    color: var(--text-300);
    flex-shrink: 0;

    &--accent { color: var(--accent); }
    &--muted  { color: var(--text-300); }
  }

  .option-text {
    .option-title {
      font-size: 13px;
      font-weight: 500;
    }
    .option-desc {
      font-size: 11px;
      color: var(--text-400);
      margin-top: 2px;
    }
  }
}

.cancel-text {
  font-size: 13px;
  color: var(--text-400);
  transition: color 0.15s;
  text-align: center;
  padding: 4px;

  &:hover:not(:disabled) { color: var(--text-200); }
  &:disabled { cursor: not-allowed; }
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
