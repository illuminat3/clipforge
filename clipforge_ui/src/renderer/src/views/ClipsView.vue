<template>
  <div class="clips-layout">
    <header class="clips-header">
      <div class="header-left">
        <Film :size="20" class="accent-icon" />
        <span class="app-title">Clipforge</span>
      </div>

      <nav class="tabs">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          :title="tab.description"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="header-right">
        <span v-if="settings" class="dir-label" :title="currentDirectory">
          <FolderOpen
            :size="12"
            style="display: inline; margin-right: 4px; vertical-align: middle"
          />
          {{ currentDirectory }}
        </span>
        <button class="icon-btn" title="Settings" @click="showSettings = true">
          <Settings :size="18" />
        </button>
      </div>
    </header>

    <main class="clips-main">
      <ClipGrid
        v-if="activeTab === 'raw'"
        :clips="clips"
        :loading="loadingClips"
        :error="clipsError"
        :service="service!"
        :clips-directory="settings?.clipsDirectory"
        @clip-select="handleClipSelect"
        @refresh="loadClips"
        @clip-delete="handleDeleteRawClip"
      />
      <ClipGrid
        v-else
        :clips="savedClips"
        :loading="loadingSaved"
        :error="savedError"
        :service="service!"
        :clips-directory="settings?.outputDirectory"
        @clip-select="handleClipSelect"
        @refresh="loadSavedClips"
        @clip-delete="handleDeleteSavedClip"
      />
    </main>

    <PreviewModal
      v-if="selectedClip && service"
      :clip="selectedClip"
      :service="service"
      :output-directory="settings?.outputDirectory ?? ''"
      @close="selectedClip = null"
      @saved-clip="handleSavedClip"
    />

    <SettingsModal
      v-if="showSettings && settings"
      :settings="settings"
      @save="handleSettingsSave"
      @close="showSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Film, FolderOpen, Settings } from 'lucide-vue-next'
import { LocalClipService } from '@renderer/services/clipService'
import type { ClipMeta, AppSettings } from '@renderer/services/clipService'
import ClipGrid from '@renderer/components/ClipGrid.vue'
import PreviewModal from '@renderer/components/PreviewModal.vue'
import SettingsModal from '@renderer/components/SettingsModal.vue'

defineOptions({ name: 'ClipsView' })

const TABS = [
  { id: 'raw', label: 'Raw', description: 'Local clips from your OBS directory' },
  { id: 'clips', label: 'Clips', description: 'Saved clips from your output directory' }
]

const activeTab = ref('raw')
const settings = ref<AppSettings | null>(null)
const service = ref<LocalClipService | null>(null)

const clips = ref<ClipMeta[]>([])
const loadingClips = ref(false)
const clipsError = ref<string | null>(null)

const savedClips = ref<ClipMeta[]>([])
const loadingSaved = ref(false)
const savedError = ref<string | null>(null)

const selectedClip = ref<ClipMeta | null>(null)
const showSettings = ref(false)

const currentDirectory = computed(() =>
  activeTab.value === 'raw' ? settings.value?.clipsDirectory : settings.value?.outputDirectory
)

onMounted(async () => {
  if (window.electronAPI) {
    const s = await window.electronAPI.settings.get()
    settings.value = s
    service.value = new LocalClipService(s.clipsDirectory, s.outputDirectory)
  } else {
    const defaults: AppSettings = {
      clipsDirectory: '',
      outputDirectory: '',
      ffmpegPath: '',
      serverUrl: '',
      serverToken: ''
    }
    settings.value = defaults
    service.value = new LocalClipService(defaults.clipsDirectory, defaults.outputDirectory)
  }
})

async function loadClips(): Promise<void> {
  if (!service.value) return
  loadingClips.value = true
  clipsError.value = null
  const result = await service.value.listClips()
  clips.value = result.clips || []
  clipsError.value = result.error || null
  loadingClips.value = false
}

async function loadSavedClips(): Promise<void> {
  if (!service.value) return
  loadingSaved.value = true
  savedError.value = null
  const result = await service.value.listOutputClips()
  savedClips.value = result.clips || []
  savedError.value = result.error || null
  loadingSaved.value = false
}

watch(
  [service, activeTab],
  ([svc, tab]) => {
    if (!svc) return
    if (tab === 'raw') loadClips()
    else loadSavedClips()
  },
  { immediate: false }
)

watch(service, (svc) => {
  if (svc) loadClips()
})

function handleClipSelect(clip: ClipMeta): void {
  selectedClip.value = clip
}

function handleSavedClip(): void {
  activeTab.value = 'clips'
}

async function handleDeleteRawClip(clipId: string): Promise<void> {
  if (!service.value) return
  const result = await service.value.deleteClip(clipId)
  if (result.success) {
    clips.value = clips.value.filter((c) => c.id !== clipId)
    if (selectedClip.value?.id === clipId) selectedClip.value = null
  }
}

async function handleDeleteSavedClip(clipId: string): Promise<void> {
  if (!service.value) return
  const result = await service.value.deleteClip(clipId)
  if (result.success) {
    savedClips.value = savedClips.value.filter((c) => c.id !== clipId)
    if (selectedClip.value?.id === clipId) selectedClip.value = null
  }
}

async function handleSettingsSave(newSettings: AppSettings): Promise<void> {
  if (window.electronAPI) {
    for (const [key, value] of Object.entries(newSettings)) {
      await window.electronAPI.settings.set(key, String(value))
    }
  }
  settings.value = newSettings
  service.value = new LocalClipService(newSettings.clipsDirectory, newSettings.outputDirectory)
  showSettings.value = false
}
</script>

<style scoped>
.clips-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
}

.clips-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 10px 16px;
  background: var(--color-secondary-background);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: 12px;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.accent-icon {
  color: var(--color-accent);
}

.app-title {
  font-weight: 600;
  color: var(--color-primary-text);
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-btn {
  -webkit-app-region: no-drag;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition:
    background 0.15s,
    color 0.15s;
  color: var(--color-secondary-text);
  background: transparent;
  user-select: none;
}

.tab-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.tab-btn.active {
  background: var(--color-accent);
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.dir-label {
  font-size: 11px;
  color: var(--color-tertiary-text);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  -webkit-app-region: no-drag;
  padding: 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-secondary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    background 0.15s;
}

.icon-btn:hover {
  color: var(--color-primary-text);
  background: var(--color-surface-active);
}

.clips-main {
  flex: 1;
  overflow: hidden;
}
</style>
