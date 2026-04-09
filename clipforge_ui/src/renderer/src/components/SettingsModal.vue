<template>
  <div class="backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="close-btn" @click="handleClose">
          <X :size="18" />
        </button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <section class="section">
          <h3 class="section-title"><FolderOpen :size="13" /> Local Directories</h3>
          <div class="field">
            <label class="field-label">Clips Directory</label>
            <p class="field-desc">Where OBS saves your raw clips</p>
            <div class="dir-row">
              <input v-model="form.clipsDirectory" type="text" class="text-input" />
              <button
                v-if="hasElectron"
                type="button"
                class="browse-btn"
                @click="pickDirectory('clipsDirectory')"
              >
                <FolderOpen :size="15" />
              </button>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Output Directory</label>
            <p class="field-desc">Where edited clips are saved (Save as Copy)</p>
            <div class="dir-row">
              <input v-model="form.outputDirectory" type="text" class="text-input" />
              <button
                v-if="hasElectron"
                type="button"
                class="browse-btn"
                @click="pickDirectory('outputDirectory')"
              >
                <FolderOpen :size="15" />
              </button>
            </div>
          </div>
        </section>

        <section class="section">
          <h3 class="section-title"><Terminal :size="13" /> FFmpeg</h3>
          <div class="field">
            <label class="field-label">FFmpeg Executable</label>
            <p class="field-desc">
              Path to ffmpeg.exe (leave blank to use system PATH or auto-detect)
            </p>
            <div class="dir-row">
              <input v-model="form.ffmpegPath" type="text" class="text-input" />
              <button
                v-if="hasElectron"
                type="button"
                class="browse-btn"
                @click="pickFile('ffmpegPath')"
              >
                <FolderOpen :size="15" />
              </button>
            </div>
          </div>
        </section>

        <section class="section">
          <h3 class="section-title"><Palette :size="13" /> Appearance</h3>
          <div class="field">
            <label class="field-label">Theme</label>
            <div class="theme-grid">
              <button
                v-for="t in THEMES"
                :key="t.value"
                :class="['theme-swatch', { active: currentTheme === t.value }]"
                @click="previewTheme(t.value)"
              >
                <span class="swatch-dot" :style="{ background: t.accent }" />
                {{ t.label }}
              </button>
            </div>
          </div>
        </section>

        <section class="section faded">
          <h3 class="section-title"><Server :size="13" /> Server (Coming Soon)</h3>
          <div class="field">
            <label class="field-label">Server URL</label>
            <p class="field-desc">Base URL of your clip server (e.g. http://192.168.1.10:3000)</p>
            <input
              v-model="form.serverUrl"
              type="text"
              class="text-input"
              placeholder="http://your-server:3000"
              disabled
            />
          </div>
          <div class="field">
            <label class="field-label">API Token</label>
            <p class="field-desc">Bearer token for authentication</p>
            <input
              v-model="form.serverToken"
              type="password"
              class="text-input"
              placeholder="your-api-token"
              disabled
            />
          </div>
          <p class="note">Server integration will be enabled in a future update.</p>
        </section>

        <div class="actions">
          <button type="button" class="cancel-btn" @click="handleClose">Cancel</button>
          <button type="submit" class="save-btn">
            <Save :size="14" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { X, FolderOpen, Terminal, Server, Save, Palette } from 'lucide-vue-next'
import type { AppSettings } from '@renderer/services/clipService'
import { useTheme, Theme } from '@renderer/composables/useTheme'

defineOptions({ name: 'SettingsModal' })

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [settings: AppSettings]
  close: []
}>()

const form = reactive<AppSettings>({ ...props.settings })
const hasElectron = computed(() => !!window.electronAPI)

const { theme: currentTheme, setTheme } = useTheme()
const originalTheme = currentTheme.value

const THEMES = [
  { value: Theme.DeepBlue, label: 'Deep Blue', accent: '#8ec0cd' },
  { value: Theme.MermaidDream, label: 'Mermaid Dream', accent: '#3fc1c0' },
  { value: Theme.PinkDelight, label: 'Pink Delight', accent: '#fb6f92' },
  { value: Theme.RedSunset, label: 'Red Sunset', accent: '#e85d04' }
]

function previewTheme(t: Theme): void {
  setTheme(t)
}

async function pickDirectory(key: keyof AppSettings): Promise<void> {
  if (!window.electronAPI) return
  const dir = await window.electronAPI.settings.selectDirectory(form[key])
  if (dir) form[key] = dir
}

async function pickFile(key: keyof AppSettings): Promise<void> {
  if (!window.electronAPI) return
  const file = await window.electronAPI.settings.selectFile(form[key])
  if (file) form[key] = file
}

function handleClose(): void {
  setTheme(originalTheme)
  emit('close')
}

function handleSubmit(): void {
  emit('save', { ...form })
}
</script>

<style scoped>
.backdrop {
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
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 500px;
  margin: 0 16px;
  overflow: hidden;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-primary-background);
  z-index: 1;
}

.modal-title {
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

.close-btn:hover {
  color: var(--color-primary-text);
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
}

.section.faded {
  opacity: 0.6;
}

.section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-tertiary-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-label {
  font-size: 13px;
  color: var(--color-secondary-text);
  margin-bottom: 4px;
}

.field-desc {
  font-size: 11px;
  color: var(--color-tertiary-text);
  margin: 0 0 6px;
}

.dir-row {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  width: 100%;
  background: var(--color-surface-active);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-primary-text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: var(--color-border-focus);
}

.text-input:disabled {
  cursor: not-allowed;
}

.browse-btn {
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--color-surface-active);
  border: 1px solid var(--color-border);
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    border-color 0.15s;
  flex-shrink: 0;
}

.browse-btn:hover {
  color: var(--color-primary-text);
  border-color: var(--color-border-focus);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.theme-swatch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-active);
  color: var(--color-secondary-text);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  text-align: left;
}

.theme-swatch:hover {
  border-color: var(--color-border-focus);
  color: var(--color-primary-text);
}

.theme-swatch.active {
  border-color: var(--color-accent);
  color: var(--color-primary-text);
}

.swatch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.note {
  margin: 0;
  font-size: 11px;
  color: var(--color-tertiary-text);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.cancel-btn {
  padding: 7px 16px;
  border-radius: 4px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-secondary-text);
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.cancel-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 4px;
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover {
  background: var(--color-accent-hover);
}
</style>
