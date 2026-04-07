<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Film, Settings, FolderOpen } from 'lucide-vue-next'
import ClipGrid from './components/ClipGrid.vue'
import PreviewModal from './components/PreviewModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import { LocalClipService } from './services/localClipService'
import type { ClipMeta } from './services/clipService'

interface AppSettings {
  clipsDirectory: string
  outputDirectory: string
  ffmpegPath: string
  serverUrl: string
  serverToken: string
}

const TABS = [
  { id: 'raw', label: 'Raw', description: 'Local clips from your OBS directory' },
  { id: 'clips', label: 'Clips', description: 'Saved clips from your output directory' },
]

const activeTab = ref('raw')
const settings = ref<AppSettings | null>(null)
const clips = ref<ClipMeta[]>([])
const loadingClips = ref(false)
const clipsError = ref<string | null>(null)
const savedClips = ref<ClipMeta[]>([])
const loadingSaved = ref(false)
const savedError = ref<string | null>(null)
const selectedClip = ref<ClipMeta | null>(null)
const showSettings = ref(false)
const service = ref<LocalClipService | null>(null)

onMounted(() => {
  if (window.electronAPI) {
    window.electronAPI.settings.get().then((s) => {
      settings.value = s as AppSettings
      service.value = new LocalClipService(s.clipsDirectory, s.outputDirectory)
    })
  } else {
    const defaults: AppSettings = {
      clipsDirectory: 'E:/Videos/Clips',
      outputDirectory: 'E:/Videos/Clips/Output',
      ffmpegPath: '',
      serverUrl: '',
      serverToken: '',
    }
    settings.value = defaults
    service.value = new LocalClipService(defaults.clipsDirectory, defaults.outputDirectory)
  }
})

const loadClips = async () => {
  if (!service.value || activeTab.value !== 'raw') return
  loadingClips.value = true
  clipsError.value = null
  const result = await service.value.listClips()
  clips.value = result.clips || []
  clipsError.value = result.error || null
  loadingClips.value = false
}

const loadSavedClips = async () => {
  if (!service.value || activeTab.value !== 'clips') return
  loadingSaved.value = true
  savedError.value = null
  const result = await service.value.listOutputClips()
  savedClips.value = result.clips || []
  savedError.value = result.error || null
  loadingSaved.value = false
}

watch(
  [service, activeTab],
  () => {
    if (!service.value) return
    if (activeTab.value === 'raw') loadClips()
    else loadSavedClips()
  }
)

const handleSettingsSave = async (newSettings: AppSettings) => {
  if (window.electronAPI) {
    for (const [key, value] of Object.entries(newSettings)) {
      await window.electronAPI.settings.set(key, value)
    }
  }
  settings.value = newSettings
  service.value = new LocalClipService(newSettings.clipsDirectory, newSettings.outputDirectory)
  showSettings.value = false
}

const handleSavedClip = () => {
  activeTab.value = 'clips'
}

const handleDeleteRawClip = async (clipId: string) => {
  if (!service.value) return
  const result = await service.value.deleteClip(clipId)
  if (result.success) {
    clips.value = clips.value.filter((c) => c.id !== clipId)
    if (selectedClip.value?.id === clipId) selectedClip.value = null
  }
}

const handleDeleteSavedClip = async (clipId: string) => {
  if (!service.value) return
  const result = await service.value.deleteClip(clipId)
  if (result.success) {
    savedClips.value = savedClips.value.filter((c) => c.id !== clipId)
    if (selectedClip.value?.id === clipId) selectedClip.value = null
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="brand">
        <Film class="brand-icon" :size="20" />
        <span class="brand-name">clipforge</span>
      </div>

      <nav class="tabs">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          :title="tab.description"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="header-right">
        <span
          v-if="settings"
          class="dir-label"
          :title="activeTab === 'raw' ? settings.clipsDirectory : settings.outputDirectory"
        >
          <FolderOpen :size="12" class="dir-icon" />
          {{ activeTab === 'raw' ? settings.clipsDirectory : settings.outputDirectory }}
        </span>
        <button class="icon-btn" title="Settings" @click="showSettings = true">
          <Settings :size="18" />
        </button>
      </div>
    </header>

    <main class="main-content">
      <ClipGrid
        v-if="activeTab === 'raw'"
        :clips="clips"
        :loading="loadingClips"
        :error="clipsError"
        :service="service"
        :clips-directory="settings?.clipsDirectory"
        @clip-select="selectedClip = $event"
        @refresh="loadClips"
        @clip-delete="handleDeleteRawClip"
      />
      <ClipGrid
        v-else
        :clips="savedClips"
        :loading="loadingSaved"
        :error="savedError"
        :service="service"
        :clips-directory="settings?.outputDirectory"
        @clip-select="selectedClip = $event"
        @refresh="loadSavedClips"
        @clip-delete="handleDeleteSavedClip"
      />
    </main>

    <PreviewModal
      v-if="selectedClip && service"
      :clip="selectedClip"
      :service="service"
      :output-directory="settings?.outputDirectory"
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

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  color: var(--text-200);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface-raised);
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  gap: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;

  .brand-icon {
    color: var(--accent);
  }

  .brand-name {
    font-weight: 600;
    color: var(--text-100);
    letter-spacing: 0.03em;
    font-size: 15px;
  }
}

.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-btn {
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  color: var(--text-300);

  &.active {
    background: var(--accent);
    color: var(--text-100);
  }

  &:not(.active):hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
}

.dir-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-400);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .dir-icon {
    flex-shrink: 0;
  }
}

.icon-btn {
  padding: 6px;
  border-radius: 4px;
  color: var(--text-300);
  transition: all 0.15s;
  display: flex;
  align-items: center;

  &:hover {
    color: var(--text-100);
    background: var(--surface-overlay);
  }
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
