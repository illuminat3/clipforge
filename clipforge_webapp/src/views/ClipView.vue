<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const clipId = computed(() => route.params.id as string);

function resolveVideoUrl(id: string): string {
  // TODO: replace with API
  console.log(`Resolving video URL for clip ID: ${id}`);
  return "/video.mp4";
}

const videoUrl = computed(() => resolveVideoUrl(clipId.value));
</script>

<template>
  <main class="clip-page">
    <div class="clip-container">
      <video
        :src="videoUrl"
        class="clip-player"
        controls
        autoplay
        playsinline
        preload="metadata"
      />
    </div>
  </main>
</template>

<style scoped>
.clip-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}

.clip-container {
  width: 100%;
  max-width: 1280px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.clip-player {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: #000;
  display: block;
}
</style>
