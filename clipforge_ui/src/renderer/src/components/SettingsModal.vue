<script setup lang="ts">
import { ref } from 'vue'
import { X, FolderOpen, Server, Save, Terminal } from 'lucide-vue-next'

interface AppSettings {
  clipsDirectory: string
  outputDirectory: string
  ffmpegPath: string
  serverUrl: string
  serverToken: string
}

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [settings: AppSettings]
  close: []
}>()

const form = ref<AppSettings>({ ...props.settings })

const set = (key: keyof AppSettings, value: string) => {
  form.value = { ...form.value, [key]: value }
}

const pickDirectory = async (key: keyof AppSettings) => {
  if (!window.electronAPI) return
  const dir = await window.electronAPI.settings.selectDirectory(form.value[key])
  if (dir) set(key, dir)
}

const pickFile = async (key: keyof AppSettings) => {
  if (!window.electronAPI) return
  const file = await window.electronAPI.settings.selectFile(form.value[key])
  if (file) set(key, file)
}

const handleSubmit = (e: Event) => {
  e.preventDefault()
  emit('save', form.value)
}
</script>

<template>
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="close-btn" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <form class="modal-body" @submit="handleSubmit">
        <!-- Local Directories -->
        <section class="section">
          <h3 class="section-title">
            <FolderOpen :size="13" />
            Local Directories
          </h3>
          <div class="fields">
            <DirField
              label="Clips Directory"
              description="Where OBS saves your raw clips"
              :value="form.clipsDirectory"
              :browse-enabled="!!window.electronAPI"
              @change="set('clipsDirectory', $event)"
              @browse="pickDirectory('clipsDirectory')"
            />
            <DirField
              label="Output Directory"
              description="Where edited clips are saved (Save as Copy)"
              :value="form.outputDirectory"
              :browse-enabled="!!window.electronAPI"
              @change="set('outputDirectory', $event)"
              @browse="pickDirectory('outputDirectory')"
            />
          </div>
        </section>

        <!-- FFmpeg -->
        <section class="section">
          <h3 class="section-title">
            <Terminal :size="13" />
            FFmpeg
          </h3>
          <DirField
            label="FFmpeg Executable"
            description="Path to ffmpeg.exe (leave blank to use system PATH)"
            :value="form.ffmpegPath"
            :browse-enabled="!!window.electronAPI"
            @change="set('ffmpegPath', $event)"
            @browse="pickFile('ffmpegPath')"
          />
        </section>

        <!-- Server (coming soon) -->
        <section class="section section--disabled">
          <h3 class="section-title">
            <Server :size="13" />
            Server <span class="coming-soon">(Coming Soon)</span>
          </h3>
          <div class="fields">
            <TextInputField
              label="Server URL"
              description="Base URL of your clip server (e.g. http://192.168.1.10:3000)"
              :value="form.serverUrl"
              placeholder="http://your-server:3000"
              :disabled="true"
              @change="set('serverUrl', $event)"
            />
            <TextInputField
              label="API Token"
              description="Bearer token for authentication"
              :value="form.serverToken"
              placeholder="your-api-token"
              type="password"
              :disabled="true"
              @change="set('serverToken', $event)"
            />
          </div>
          <p class="section-note">Server integration will be enabled in a future update.</p>
        </section>

        <!-- Actions -->
        <div class="actions">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-save">
            <Save :size="14" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<!-- Sub-components as plain Vue components defined inline -->
<script lang="ts">
import { defineComponent, h } from 'vue'
import { FolderOpen as FolderOpenIcon } from 'lucide-vue-next'

// DirField sub-component
const DirField = defineComponent({
  props: {
    label: String,
    description: String,
    value: String,
    browseEnabled: Boolean,
  },
  emits: ['change', 'browse'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'field' }, [
        h('label', { class: 'field-label' }, props.label),
        props.description ? h('p', { class: 'field-desc' }, props.description) : null,
        h('div', { class: 'field-row' }, [
          h('input', {
            type: 'text',
            value: props.value || '',
            class: 'field-input',
            onInput: (e: Event) => emit('change', (e.target as HTMLInputElement).value),
          }),
          props.browseEnabled
            ? h('button', {
                type: 'button',
                class: 'browse-btn',
                title: 'Browse',
                onClick: () => emit('browse'),
              }, h(FolderOpenIcon, { size: 15 }))
            : null,
        ]),
      ])
  },
})

// TextInputField sub-component
const TextInputField = defineComponent({
  props: {
    label: String,
    description: String,
    value: String,
    placeholder: String,
    type: { type: String, default: 'text' },
    disabled: Boolean,
  },
  emits: ['change'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'field' }, [
        h('label', { class: 'field-label' }, props.label),
        props.description ? h('p', { class: 'field-desc' }, props.description) : null,
        h('input', {
          type: props.type,
          value: props.value || '',
          placeholder: props.placeholder,
          disabled: props.disabled,
          class: 'field-input',
          onInput: (e: Event) => emit('change', (e.target as HTMLInputElement).value),
        }),
      ])
  },
})

export { DirField, TextInputField }
</script>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 480px;
  margin: 0 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--surface-border);

  .modal-title {
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
  }
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &--disabled {
    opacity: 0.6;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-400);

    .coming-soon {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
    }
  }

  .section-note {
    font-size: 11px;
    color: var(--text-400);
    margin-top: -4px;
  }
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--surface-border);
}

.btn-cancel {
  padding: 7px 16px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-300);
  transition: all 0.15s;

  &:hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 4px;
  font-size: 13px;
  background: var(--accent);
  color: white;
  transition: background 0.15s;

  &:hover { background: var(--accent-hover); }
}

// Field styles (shared across DirField and TextInputField rendered via h())
:deep(.field) {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .field-label {
    font-size: 13px;
    color: var(--text-200);
    display: block;
  }

  .field-desc {
    font-size: 11px;
    color: var(--text-400);
    margin: 0;
  }

  .field-row {
    display: flex;
    gap: 8px;
  }

  .field-input {
    flex: 1;
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--text-200);
    transition: border-color 0.15s;
    outline: none;

    &:focus {
      border-color: var(--accent);
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .browse-btn {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
    color: var(--text-300);
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover {
      color: var(--text-100);
      border-color: var(--accent);
    }
  }
}
</style>
