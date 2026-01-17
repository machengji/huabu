<template>
  <div class="ai-panel glass-panel" v-show="modelValue">
    <div class="panel-header">
      <div class="header-main">
        <Sparkles class="sparkle-icon" :size="20" />
        <h2>AI 助手</h2>
      </div>
      <div class="header-actions">
         <button class="icon-btn" :class="{ active: showSettings }" @click="showSettings = !showSettings" title="API 设置">
            <Settings :size="18" />
         </button>
         <button class="icon-btn close-btn" @click="$emit('update:modelValue', false)">
            <X :size="18" />
         </button>
      </div>
    </div>

    <!-- API Settings Section -->
    <div v-if="showSettings" class="settings-section">
      <div class="setting-group">
        <label>选择模型</label>
        <select v-model="selectedModel" class="model-select">
          <option value="minimax">MiniMax (image-01)</option>
          <option value="kling">Kling AI (kling-v1)</option>
          <option value="liblib">LibLibAI (Star-3)</option>
        </select>
      </div>
      
      <div class="api-key-group">
        <label>
          {{ selectedModel === 'minimax' ? 'MiniMax API Key' : 
             selectedModel === 'kling' ? 'Kling Access Key' : 'LibLib Access Key' }}
        </label>
        <div class="input-with-icon">
          <Key :size="14" class="input-icon" />
          <input 
            type="password" 
            v-model="apiKey" 
            class="api-input"
          >
        </div>
      </div>

      <div v-if="selectedModel === 'kling' || selectedModel === 'liblib'" class="api-key-group">
        <label>{{ selectedModel === 'kling' ? 'Kling' : 'LibLib' }} Secret Key</label>
        <div class="input-with-icon">
          <Key :size="14" class="input-icon" />
          <input 
            type="password" 
            v-model="secretKey" 
            class="api-input"
          >
        </div>
      </div>
      <p class="api-tip">Key 仅保存在本地浏览器中</p>
    </div>

    <div class="panel-content">
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
    </div>

    <div class="input-area-wrapper">
      <div class="input-area">
        <textarea 
          v-model="prompt" 
          placeholder="描述你的创意..."
          @keydown.enter.prevent="handleGenerate"
        ></textarea>
        <button 
          class="generate-btn" 
          :disabled="isGenerating || !prompt.trim()"
          @click="handleGenerate"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Sparkles, Send, Settings, Key, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'generate'])

const prompt = ref('')
const isGenerating = ref(false)
const statusText = ref('AI 正在思考...')
const showSettings = ref(false)
const selectedModel = ref('minimax')

const minimaxKey = ref('')
const klingKey = ref('')
const klingSecretKey = ref('')
const liblibKey = ref('')
const liblibSecretKey = ref('')

const apiKey = computed({
  get: () => {
    if (selectedModel.value === 'minimax') return minimaxKey.value
    if (selectedModel.value === 'kling') return klingKey.value
    if (selectedModel.value === 'liblib') return liblibKey.value
    return ''
  },
  set: (val) => {
    if (selectedModel.value === 'minimax') minimaxKey.value = val
    else if (selectedModel.value === 'kling') klingKey.value = val
    else if (selectedModel.value === 'liblib') liblibKey.value = val
  }
})

const secretKey = computed({
  get: () => {
    if (selectedModel.value === 'kling') return klingSecretKey.value
    if (selectedModel.value === 'liblib') return liblibSecretKey.value
    return ''
  },
  set: (val) => {
    if (selectedModel.value === 'kling') klingSecretKey.value = val
    else if (selectedModel.value === 'liblib') liblibSecretKey.value = val
  }
})

onMounted(() => {
  minimaxKey.value = localStorage.getItem('minimax_api_key') || ''
  klingKey.value = localStorage.getItem('kling_api_key') || ''
  klingSecretKey.value = localStorage.getItem('kling_secret_key') || ''
  liblibKey.value = localStorage.getItem('liblib_api_key') || ''
  liblibSecretKey.value = localStorage.getItem('liblib_secret_key') || ''
  selectedModel.value = localStorage.getItem('selected_model') || 'minimax'
})

watch(minimaxKey, (val) => localStorage.setItem('minimax_api_key', val))
watch(klingKey, (val) => localStorage.setItem('kling_api_key', val))
watch(klingSecretKey, (val) => localStorage.setItem('kling_secret_key', val))
watch(liblibKey, (val) => localStorage.setItem('liblib_api_key', val))
watch(liblibSecretKey, (val) => localStorage.setItem('liblib_secret_key', val))
watch(selectedModel, (val) => localStorage.setItem('selected_model', val))

const handleGenerate = async () => {
  if (!prompt.value.trim() || isGenerating.value) return
  
  if (!apiKey.value) {
    showSettings.value = true
    alert(`请先配置 ${selectedModel.value} API Key`)
    return
  }
  
  isGenerating.value = true
  statusText.value = 'AI 正在构思排版...'
  
  try {
    await emit('generate', { 
      prompt: prompt.value, 
      apiKey: apiKey.value,
      secretKey: secretKey.value,
      model: selectedModel.value
    })
    prompt.value = ''
    // Optionally close after generate? No, keep it open for chat feel.
  } catch (e) {
      console.error(e)
  } finally {
    isGenerating.value = false
  }
}

// Expose setGenerating to parent if needed, or just handle via emit prop
// But actually the parent does the generation logic.
// We should probably accept `isGenerating` as a prop if we want perfect sync, 
// but for now local state + await emit is fine if parent awaits.
</script>

<style scoped>
.ai-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 320px;
  height: 600px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  z-index: 900;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .ai-panel {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
}

.panel-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3b82f6;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: #64748b;
  transition: all 0.2s;
}

.icon-btn:hover, .icon-btn.active {
  background: rgba(0, 0, 0, 0.05);
  color: #3b82f6;
}

.close-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.settings-section {
  padding: 16px 20px;
  background: rgba(59, 130, 246, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-group, .api-key-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-group label, .api-key-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.model-select, .api-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  background: white;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
}

.api-input {
    padding-left: 32px;
}

.api-tip {
    font-size: 0.7rem;
    color: #94a3b8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  background: #f1f5f9;
  color: #1e293b;
  margin-bottom: 12px;
}

.dark .message {
    background: #334155;
    color: #f1f5f9;
}

.input-area-wrapper {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255,255,255,0.5);
}

.input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: white;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  max-height: 100px;
  padding: 6px;
}

.generate-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.generate-btn:hover:not(:disabled) {
    transform: scale(1.05);
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
