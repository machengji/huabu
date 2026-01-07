<template>
  <aside class="side-panel glass-panel">
    <div class="panel-header">
      <Sparkles class="sparkle-icon" :size="20" />
      <h2>AI 设计助手</h2>
    </div>

    <div class="panel-content">
      <!-- AI Chat Section -->
      <div class="chat-section">
        <div class="message ai-message">
          <p>你好！我是你的 AI 设计助手。告诉我你想设计什么样的海报？</p>
        </div>
        
        <div v-if="isGenerating" class="message ai-message loading">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
          <p>{{ statusText }}</p>
        </div>
      </div>

      <!-- Input Section -->
      <div class="input-area">
        <textarea 
          v-model="prompt" 
          placeholder="输入设计需求，例如：蛇年春节红色海报..."
          @keydown.enter.prevent="handleGenerate"
        ></textarea>
        <button 
          class="generate-btn" 
          :disabled="isGenerating || !prompt.trim()"
          @click="handleGenerate"
        >
          <Send :size="18" />
          <span>智能生成</span>
        </button>
      </div>

      <!-- Properties Section -->
      <div v-if="selectedObject" class="properties-section">
        <h3>元素属性</h3>
        <div class="property-group">
          <label>颜色</label>
          <div class="color-input-wrapper">
            <input 
              type="color" 
              :value="objectColor" 
              @input="updateColor"
            >
            <span>{{ objectColor }}</span>
          </div>
        </div>
        
        <div v-if="selectedObject.type === 'textbox'" class="property-group">
          <label>字号</label>
          <input 
            type="number" 
            :value="selectedObject.fontSize" 
            @input="e => $emit('update-property', { key: 'fontSize', value: parseInt(e.target.value) })"
          >
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Sparkles, Send } from 'lucide-vue-next'

const props = defineProps({
  selectedObject: Object
})

const emit = defineEmits(['generate', 'update-property'])

const prompt = ref('')
const isGenerating = ref(false)
const statusText = ref('AI 正在思考...')

const objectColor = computed(() => {
  if (!props.selectedObject) return '#000000'
  const color = props.selectedObject.fill || '#000000'
  
  // Normalize rgb/rgba to hex for <input type="color">
  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g)
    if (rgb && rgb.length >= 3) {
      const hex = '#' + rgb.slice(0, 3).map(x => {
        const h = parseInt(x).toString(16)
        return h.length === 1 ? '0' + h : h
      }).join('')
      return hex
    }
  }
  return color
})

const handleGenerate = async () => {
  if (!prompt.value.trim() || isGenerating.value) return
  
  isGenerating.value = true
  statusText.value = 'AI 正在构思排版...'
  
  try {
    await emit('generate', prompt.value)
    prompt.value = ''
  } finally {
    isGenerating.value = false
  }
}

const updateColor = (e) => {
  emit('update-property', { key: 'fill', value: e.target.value })
}
</script>

<style scoped>
.side-panel {
  width: 360px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 50;
  border-radius: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

.dark .side-panel {
  border-left-color: rgba(255, 255, 255, 0.1);
}

.panel-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.dark .panel-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.sparkle-icon {
  color: #8b5cf6;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  padding-bottom: 40px;
  gap: 20px;
  overflow-y: auto;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 0.95rem;
  max-width: 90%;
}

.ai-message {
  background: rgba(59, 130, 246, 0.1);
  color: #1e293b;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.dark .ai-message {
  background: rgba(59, 130, 246, 0.2);
  color: #f1f5f9;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.dark textarea {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}

textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.generate-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.properties-section {
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dark .properties-section {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.properties-section h3 {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.property-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.property-group label {
  font-size: 0.9rem;
  font-weight: 500;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 8px;
}

.dark .color-input-wrapper {
  background: rgba(255, 255, 255, 0.1);
}

input[type="color"] {
  width: 24px;
  height: 24px;
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
