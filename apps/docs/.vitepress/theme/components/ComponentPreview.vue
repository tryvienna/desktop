<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useData, withBase } from 'vitepress'

const props = defineProps<{
  storyId: string
  title?: string
  height?: string
}>()

const { isDark } = useData()
const themeOverride = ref<string | null>(null)
const iframeLoaded = ref(false)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const autoHeight = ref<number | null>(null)

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'vscode', label: 'VS Code' },
] as const

const activeTheme = computed(() => {
  if (themeOverride.value) return themeOverride.value
  return isDark.value ? 'dark' : 'light'
})

const iframeSrc = computed(
  () => withBase(`/_storybook/iframe?id=${props.storyId}&viewMode=story&globals=theme:${activeTheme.value}`)
)

const MIN_HEIGHT = 80
const MAX_HEIGHT = 800

const frameHeight = computed(() => {
  if (autoHeight.value) return Math.min(Math.max(autoHeight.value, MIN_HEIGHT), MAX_HEIGHT)
  return Number(props.height) || 200
})

const MEASURE_SCRIPT = `
  (function() {
    function measure() {
      var root = document.getElementById('storybook-root');
      if (!root || !root.firstElementChild) return false;
      var el = root;
      var saved = [];
      while (el) {
        saved.push({ el: el, mh: el.style.maxHeight, ov: el.style.overflow, h: el.style.height });
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
        el = el.parentElement;
      }
      var content = root.firstElementChild;
      var h = content.getBoundingClientRect().height;
      for (var i = 0; i < saved.length; i++) {
        saved[i].el.style.maxHeight = saved[i].mh;
        saved[i].el.style.overflow = saved[i].ov;
        saved[i].el.style.height = saved[i].h;
      }
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      if (h > 10) {
        window.parent.postMessage({ type: 'component-preview-height', storyId: '__STORY_ID__', height: Math.ceil(h) + 32 }, '*');
        return true;
      }
      return false;
    }
    // Try immediately, then retry at increasing intervals for slow loads.
    // Stop as soon as one succeeds.
    var done = measure();
    if (!done) {
      var timers = [];
      var attempts = [100, 300, 600, 1000, 2000];
      attempts.forEach(function(delay) {
        timers.push(setTimeout(function() {
          if (!done && measure()) {
            done = true;
            timers.forEach(clearTimeout);
          }
        }, delay));
      });
    }
  })();
`

function tryInjectScript(iframe: HTMLIFrameElement) {
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return false
    const script = doc.createElement('script')
    script.textContent = MEASURE_SCRIPT.replace(/__STORY_ID__/g, props.storyId)
    doc.body.appendChild(script)
    return true
  } catch {
    return false
  }
}

function onIframeLoad() {
  iframeLoaded.value = true
  const iframe = iframeRef.value
  if (!iframe) return

  // Try script injection (works for same-origin)
  // Delay slightly to let Storybook start rendering
  setTimeout(() => {
    if (!tryInjectScript(iframe)) {
      // Cross-origin: fall back to default height
      // The iframe is still visible, just at the default/prop height
    }
  }, 150)
}

function onMessage(e: MessageEvent) {
  if (e.data?.type === 'component-preview-height' && e.data.storyId === props.storyId) {
    const h = e.data.height
    if (h > MIN_HEIGHT) {
      autoHeight.value = h
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', onMessage)
}

watch(iframeSrc, () => {
  autoHeight.value = null
  iframeLoaded.value = false
})
</script>

<template>
  <div class="component-preview">
    <div class="component-preview-toolbar">
      <span v-if="title" class="component-preview-title">{{ title }}</span>
      <div class="component-preview-themes">
        <button
          v-for="t in themes"
          :key="t.value"
          :class="['component-preview-theme-btn', { active: activeTheme === t.value }]"
          @click="themeOverride = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
    <div class="component-preview-frame" :style="{ height: frameHeight + 'px' }">
      <div v-if="!iframeLoaded" class="component-preview-skeleton" />
      <iframe
        ref="iframeRef"
        :src="iframeSrc"
        :style="{ opacity: iframeLoaded ? 1 : 0 }"
        frameborder="0"
        loading="lazy"
        @load="onIframeLoad"
      />
    </div>
  </div>
</template>

<style scoped>
.component-preview {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
}

.component-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background-color: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
}

.component-preview-title {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.component-preview-themes {
  display: flex;
  gap: 2px;
  background: var(--vp-c-bg-soft);
  border-radius: 3px;
  padding: 2px;
}

.component-preview-theme-btn {
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  border-radius: 2px;
  font-size: 11px;
  font-family: var(--vp-font-family-base);
  transition: all 0.15s;
}

.component-preview-theme-btn:hover {
  color: var(--vp-c-text-1);
}

.component-preview-theme-btn.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.component-preview-frame {
  position: relative;
  background: var(--vp-c-bg);
  transition: height 0.2s ease;
}

.component-preview-skeleton {
  position: absolute;
  inset: 0;
  background: var(--vp-c-bg-alt);
  animation: preview-pulse 1.5s ease-in-out infinite;
}

@keyframes preview-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.component-preview-frame iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  transition: opacity 0.2s;
}
</style>
