<template>
  <div class="backdrop">
    <div class="dialog">
      <div class="dialog-header">
        <h3 class="dialog-title">Save Clip</h3>
        <button :disabled="saving" class="close-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <p class="dialog-desc">
        How would you like to save <strong>{{ clipName }}</strong
        >?
      </p>

      <div v-if="error" class="error-banner">
        <AlertCircle :size="15" style="flex-shrink: 0; margin-top: 2px" />
        <span>{{ error }}</span>
      </div>

      <div class="options">
        <!-- Overwrite -->
        <button
          :disabled="saving"
          class="save-option opt-danger"
          @click="$emit('save', 'overwrite')"
        >
          <span class="opt-icon danger-icon">
            <Loader2 v-if="saving" :size="18" class="animate-spin" />
            <Save v-else :size="18" />
          </span>
          <div>
            <p class="opt-title">Overwrite</p>
            <p class="opt-desc">Replace the original file with the edited version</p>
          </div>
        </button>

        <!-- Save as Copy -->
        <button :disabled="saving" class="save-option opt-primary" @click="$emit('save', 'copy')">
          <span class="opt-icon accent-icon">
            <Loader2 v-if="saving" :size="18" class="animate-spin" />
            <Copy v-else :size="18" />
          </span>
          <div>
            <p class="opt-title">Save as Copy</p>
            <p class="opt-desc">Save to Output folder as clip_timestamp.mp4</p>
          </div>
        </button>

        <!-- Choose Location -->
        <button
          :disabled="saving"
          class="save-option opt-secondary"
          @click="$emit('save', 'browse')"
        >
          <span class="opt-icon muted-icon">
            <Loader2 v-if="saving" :size="18" class="animate-spin" />
            <FolderOpen v-else :size="18" />
          </span>
          <div>
            <p class="opt-title">Choose Location</p>
            <p class="opt-desc">Pick where to save — named clip_timestamp.mp4</p>
          </div>
        </button>
      </div>

      <button :disabled="saving" class="cancel-btn" @click="$emit('close')">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, Save, Copy, FolderOpen, AlertCircle, Loader2 } from 'lucide-vue-next'

defineOptions({ name: 'SaveDialog' })

defineProps<{
  clipName: string
  saving: boolean
  error: string | null
}>()

defineEmits<{
  save: [mode: 'overwrite' | 'copy' | 'browse']
  close: []
}>()
</script>

<style scoped>
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
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 360px;
  margin: 0 16px;
  padding: 24px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary-text);
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.close-btn:hover:not(:disabled) {
  color: var(--color-primary-text);
}

.dialog-desc {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--color-secondary-text);
}

.dialog-desc strong {
  color: var(--color-primary-text);
  font-weight: 500;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-error);
  font-size: 13px;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.save-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--color-primary-text);
  transition:
    border-color 0.15s,
    background 0.15s;
}

.save-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-option.opt-primary:not(:disabled):hover {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.save-option.opt-danger:not(:disabled):hover {
  border-color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.save-option.opt-secondary:not(:disabled):hover {
  border-color: var(--color-secondary-text);
  background: var(--color-surface-active);
}

.opt-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.accent-icon {
  color: var(--color-accent);
}
.danger-icon {
  color: var(--color-error);
}
.muted-icon {
  color: var(--color-secondary-text);
}

.opt-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

.opt-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-tertiary-text);
}

.cancel-btn {
  width: 100%;
  margin-top: 14px;
  padding: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-tertiary-text);
  cursor: pointer;
  transition: color 0.15s;
}

.cancel-btn:hover:not(:disabled) {
  color: var(--color-secondary-text);
}
</style>
