<template>
  <div class="ai-generator-panel" v-if="show" v-click-outside="close">
    <div class="input-card glass-panel">
      <textarea 
        v-model="prompt" 
        placeholder="今天我们要创作什么"
        @keydown.enter.prevent="handleGenerate"
      ></textarea>
      
      <div class="bottom-bar">
        <div class="selectors">
          <div class="selector model-selector" @click.stop="toggleMenu('model')">
            <Sparkles :size="14" class="icon" />
            <span>{{ selectedModelLabel }}</span>
            <ChevronDown :size="14" class="arrow" />
            
            <div v-if="activeMenu === 'model'" class="dropdown-menu">
              <div 
                v-for="m in models" 
                :key="m.id" 
                class="menu-item"
                :class="{ active: selectedModel === m.id }"
                @click="selectedModel = m.id"
              >
                {{ m.name }}
              </div>
            </div>
          </div>

          <div class="selector icon-selector">
            <ImageIcon :size="16" />
          </div>

          <div class="selector quality-selector" @click.stop="toggleMenu('quality')">
            <span>{{ selectedQuality }}</span>
            <ChevronDown :size="14" class="arrow" />
            
            <div v-if="activeMenu === 'quality'" class="dropdown-menu">
              <div 
                v-for="q in qualities" 
                :key="q" 
                class="menu-item"
                :class="{ active: selectedQuality === q }"
                @click="selectedQuality = q"
              >
                {{ q }}
              </div>
            </div>
          </div>

          <div class="selector ratio-selector" @click.stop="toggleMenu('ratio')">
            <span>{{ selectedRatio }}</span>
            <ChevronDown :size="14" class="arrow" />
            
            <div v-if="activeMenu === 'ratio'" class="dropdown-menu">
              <div 
                v-for="r in ratios" 
                :key="r" 
                class="menu-item"
                :class="{ active: selectedRatio === r }"
                @click="selectedRatio = r"
              >
                {{ r }}
              </div>
            </div>
          </div>
        </div>

        <button 
          class="generate-btn" 
          :disabled="isGenerating || !prompt.trim()"
          @click="handleGenerate"
        >
          <Zap :size="16" fill="currentColor" />
          <span>{{ isGenerating ? '...' : '10' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Sparkles, ImageIcon, ChevronDown, Zap } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'generate'])

const prompt = ref('')
const isGenerating = ref(false)
const selectedModel = ref('nano-banana-pro')
const selectedQuality = ref('1K')
const selectedRatio = ref('3:4')
const activeMenu = ref(null)

const models = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'kling', name: 'Kling AI' },
  { id: 'liblib', name: 'LibLibAI' }
]

const qualities = ['1K', '2K', '4K']
const ratios = ['1:1', '3:4', '4:3', '16:9', '9:16']

watch(selectedRatio, (newRatio) => {
  emit('ratio-change', newRatio)
})

const selectedModelLabel = computed(() => {
  return models.find(m => m.id === selectedModel.value)?.name || 'Model'
})

const toggleMenu = (menu) => {
  if (activeMenu.value === menu) {
    activeMenu.value = null
  } else {
    activeMenu.value = menu
  }
}

const close = () => {
  activeMenu.value = null
  emit('close')
}

const handleGenerate = () => {
  if (!prompt.value.trim() || isGenerating.value) return
  
  // 关键：生成前移除参考框，防止它干扰最终图片的显示或被误删除
  emit('close') 
  
  emit('generate', {
    prompt: prompt.value,
    model: selectedModel.value,
    quality: selectedQuality.value,
    ratio: selectedRatio.value
  })
}

// Click outside directive logic
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      // 关键修复：如果点击的是画布上的 AI 矩形，不要触发关闭
      // 我们通过检查 event.target 或者 activeMenu 来判断
      const isCanvas = event.target.tagName === 'CANVAS';
      if (!(el === event.target || el.contains(event.target)) && !isCanvas) {
        binding.value(event)
      }
    }
    document.addEventListener('mousedown', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el.clickOutsideEvent)
  }
}

const handleGlobalClick = () => {
  activeMenu.value = null
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.ai-generator-panel {
  position: absolute;
  width: 500px;
  z-index: 1100;
  transition: opacity 0.2s ease;
  transform: translateX(-50%);
}

.input-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dark .input-card {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}

textarea {
  width: 100%;
  min-height: 80px;
  border: none;
  background: transparent;
  resize: none;
  font-size: 1.1rem;
  outline: none;
  color: #1e293b;
  padding: 8px;
}

.dark textarea {
  color: #f8fafc;
}

textarea::placeholder {
  color: #94a3b8;
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selectors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #475569;
  transition: all 0.2s;
  position: relative;
  user-select: none;
}

.dark .selector {
  color: #cbd5e1;
}

.selector:hover {
  background: rgba(0, 0, 0, 0.04);
}

.dark .selector:hover {
  background: rgba(255, 255, 255, 0.05);
}

.icon {
  color: #64748b;
}

.arrow {
  color: #94a3b8;
}

.generate-btn {
  background: #e2e8f0;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #64748b;
  font-weight: 600;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: #cbd5e1;
  color: #1e293b;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 160px;
  overflow: hidden;
  z-index: 10;
}

.dark .dropdown-menu {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.1);
}

.menu-item {
  padding: 10px 12px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.menu-item:hover {
  background: #f1f5f9;
}

.dark .menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.menu-item.active {
  color: #3b82f6;
  font-weight: 600;
}
</style>
