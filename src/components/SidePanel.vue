<template>
  <aside class="side-panel glass-panel">
    <div class="panel-header">
      <div class="header-main">
        <Sparkles class="sparkle-icon" :size="20" />
        <h2>AI 设计助手</h2>
      </div>
      <button class="settings-btn" :class="{ active: showSettings }" @click="showSettings = !showSettings">
        <Settings :size="18" />
      </button>
    </div>

    <!-- Tab Switcher -->
    <div class="tab-switcher">
      <button 
        :class="['tab-btn', { active: activeTab === 'ai' }]" 
        @click="activeTab = 'ai'"
      >
        <Sparkles :size="16" />
        AI 助手
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'projects' }]" 
        @click="activeTab = 'projects'"
      >
        <FolderOpen :size="16" />
        我的项目
      </button>
    </div>

    <!-- API Settings Section -->
    <div v-if="showSettings" class="settings-section">
      <div class="setting-group">
        <label>选择模型 / 服务</label>
        <select v-model="selectedModel" class="model-select">
          <option value="minimax">MiniMax (image-01)</option>
          <option value="kling">Kling AI (kling-v1)</option>
          <option value="liblib">LibLibAI (Star-3)</option>
          <!-- LeanCloud is built-in, no key required from user -->
          <!-- <option value="leancloud">LeanCloud (云同步)</option> -->
        </select>
      </div>
      
      <div v-if="selectedModel !== 'leancloud'" class="api-key-group">
        <label>
          {{ selectedModel === 'minimax' ? 'MiniMax API Key' : 
             selectedModel === 'kling' ? 'Kling Access Key' : 'LibLib Access Key' }}
        </label>
        <div class="input-with-icon">
          <Key :size="14" class="input-icon" />
          <input 
            type="password" 
            v-model="apiKey" 
            :placeholder="selectedModel === 'minimax' ? '输入您的 API Key' : '输入您的 Access Key'"
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
            placeholder="输入您的 Secret Key"
            class="api-input"
          >
        </div>
      </div>

      <p class="api-tip">Key 仅保存在本地浏览器中</p>
    </div>

    <div class="panel-content">
      <!-- AI Assistant Tab -->
      <template v-if="activeTab === 'ai'">
        <!-- Properties Section (Higher priority when object selected) -->
        <div v-if="selectedObject" class="properties-section">
          <h3>元素属性</h3>
          
          <!-- Single Object View -->
          <template v-if="selectedObjects.length === 1">
            <div class="property-group">
              <label>名称</label>
              <input 
                type="text" 
                :value="selectedObject.name || ''" 
                @input="e => $emit('update-property', { key: 'name', value: e.target.value })"
                placeholder="未命名元素"
                class="name-input"
              >
            </div>

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
                :value="selectedObject.fontSize || 20" 
                @input="e => $emit('update-property', { key: 'fontSize', value: parseInt(e.target.value) })"
              >
            </div>

            <div class="property-group">
              <label>旋转角度</label>
              <div class="input-with-suffix">
                <input 
                  type="number" 
                  :value="Math.round(selectedObject.angle || 0)" 
                  @input="e => $emit('update-property', { key: 'angle', value: parseInt(e.target.value) || 0 })"
                  class="angle-input"
                >
                <span class="suffix">°</span>
              </div>
            </div>
          </template>

          <!-- Multi Selection View -->
          <div v-else class="multi-selection-list">
            <div 
              v-for="(obj, index) in selectedObjects" 
              :key="obj.id || index" 
              class="mini-property-card"
              @click="handleLocateObject(obj)"
              title="点击定位到此元素"
            >
              <div class="card-header">
                <component 
                  :is="(obj.type && (obj.type.toLowerCase().includes('image'))) ? 'Image' : ((obj.type && obj.type.toLowerCase().includes('text')) ? 'Type' : 'Square')" 
                  :size="14" 
                  class="obj-icon"
                />
                <span class="obj-name">{{ getObjectName(obj) }}</span>
                <button class="mini-delete-btn" @click.stop="$emit('delete-object', obj)" title="删除此元素">
                  <Trash2 :size="12" />
                </button>
              </div>
              <div class="card-body">
                <div class="mini-input-group">
                  <label>旋转</label>
                  <div class="input-with-suffix small">
                    <input 
                      type="number" 
                      :value="Math.round(obj.angle || 0)" 
                      @input="e => $emit('update-object', { obj, key: 'angle', value: parseInt(e.target.value) || 0 })"
                      @click.stop
                      class="angle-input"
                    >
                    <span class="suffix">°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      </template>

      <!-- Projects Tab -->
      <template v-else>
        <div class="projects-section">
          <button class="save-project-btn" @click="handleSaveProject">
            <Plus :size="18" />
            保存当前项目
          </button>

          <div class="projects-grid">
            <div v-for="project in projects" :key="project.objectId" class="project-card">
              <div class="project-thumb" @click="handleLoadProject(project)">
                <img :src="formatThumbnail(project.thumbnail)" alt="thumbnail">
                <div class="project-overlay">
                  <Play :size="24" />
                </div>
              </div>
              <div class="project-info">
                <span class="project-name">{{ project.name }}</span>
                <button class="delete-project-btn" @click="handleDeleteProject(project.objectId)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="projects.length === 0" class="empty-projects">
            <FolderOpen :size="48" />
            <p>暂无保存的项目</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Fixed Input Section at Bottom (Only for AI Tab) -->
    <div v-if="activeTab === 'ai'" class="input-area-wrapper">
      <div class="input-area" :class="{ 'has-tags': selectedObject }">
        <!-- Selected Objects Tags (Cursor Style) -->
        <div v-if="selectedObjects.length > 0" class="selected-tags">
          <div 
            v-for="obj in selectedObjects" 
            :key="obj.id || obj.name" 
            class="tag" 
            @click="handleLocateObject(obj)" 
            title="点击定位到元素"
          >
            <span class="tag-icon">
              <component 
                :is="obj.type === 'image' || obj.type === 'fabric.Image' ? 'Image' : (obj.type === 'textbox' ? 'Type' : 'Square')" 
                :size="12" 
              />
            </span>
            <span class="tag-text">{{ getObjectName(obj) }}</span>
            <span class="tag-edit" @click.stop="handleRenameObject(obj)">
              <Edit3 :size="10" />
            </span>
          </div>
        </div>

        <textarea 
          v-model="prompt" 
          placeholder="输入设计需求..."
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
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, onMounted, toRaw } from 'vue'
import { Sparkles, Send, Settings, Key, FolderOpen, Plus, Play, Trash2, Image, Square, Type } from 'lucide-vue-next'
import { saveProject, getProjects, deleteProject, loadFullProject } from '../services/leancloud'
import { getLocalProjects, saveLocalProject, deleteLocalProject } from '../services/localProjects'

const props = defineProps({
  selectedObject: Object
})

const emit = defineEmits(['generate', 'update-property', 'update-object', 'load-project', 'get-canvas-state', 'locate-object'])

const activeTab = ref('ai')
const prompt = ref('')
const isGenerating = ref(false)
const statusText = ref('AI 正在思考...')
const selectedObjects = computed(() => {
  if (!props.selectedObject) return []
  const rawObj = toRaw(props.selectedObject)
  
  // Robust check for multi-object structures (ActiveSelection or Group)
  // Fabric.js objects usually have getObjects if they are collections
  if (typeof rawObj.getObjects === 'function') {
    const objects = rawObj.getObjects()
    // If it's an ActiveSelection, OR it's a Group with multiple items
    // we should treat it as a multi-selection list
    if (rawObj.type === 'activeSelection' || (objects.length > 1)) {
      return objects
    }
  }
  
  return [rawObj]
})

const getObjectName = (obj) => {
  if (!obj) return ''
  const raw = toRaw(obj)
  
  // Try to get name from property or .get() method (Fabric pattern)
  const name = raw.name || (raw.get && typeof raw.get === 'function' ? raw.get('name') : null)
  if (name) return name
  
  const type = (raw.type || '').toLowerCase()
  if (type.includes('image')) return '图片'
  if (type.includes('text') || type === 'i-text') return '文字'
  if (type === 'rect') return '矩形'
  if (type === 'circle') return '圆形'
  if (type === 'triangle') return '三角形'
  if (type === 'path' || type === 'polygon') return '形状'
  if (type === 'group') return '组合'
  
  return '元素'
}

const handleLocateObject = (obj) => {
  if (obj) {
    emit('locate-object', obj)
  }
}

const handleRenameObject = (obj) => {
  if (!obj) return
  const oldName = obj.name || '未命名元素'
  const newName = window.prompt('修改元素名称', oldName)
  if (newName && newName !== oldName) {
    // If it's part of a selection, we need to update the object directly
    // and then trigger a property update
    obj.set('name', newName)
    emit('update-property', { key: 'name', value: newName })
  }
}
const showSettings = ref(false)
const selectedModel = ref('minimax')

const minimaxKey = ref('')
const klingKey = ref('')
const klingSecretKey = ref('')
const liblibKey = ref('')
const liblibSecretKey = ref('')

const projects = ref([])

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

onMounted(async () => {
  minimaxKey.value = localStorage.getItem('minimax_api_key') || ''
  klingKey.value = localStorage.getItem('kling_api_key') || ''
  klingSecretKey.value = localStorage.getItem('kling_secret_key') || ''
  liblibKey.value = localStorage.getItem('liblib_api_key') || ''
  liblibSecretKey.value = localStorage.getItem('liblib_secret_key') || ''
  selectedModel.value = localStorage.getItem('selected_model') || 'minimax'
  
  // Load cloud projects on mount (if applicable)
  loadProjectsList()
})

watch(minimaxKey, (val) => localStorage.setItem('minimax_api_key', val))
watch(klingKey, (val) => localStorage.setItem('kling_api_key', val))
watch(klingSecretKey, (val) => localStorage.setItem('kling_secret_key', val))
watch(liblibKey, (val) => localStorage.setItem('liblib_api_key', val))
watch(liblibSecretKey, (val) => localStorage.setItem('liblib_secret_key', val))
watch(activeTab, (val) => {
  if (val === 'projects') loadProjectsList()
})
watch(selectedModel, (val) => localStorage.setItem('selected_model', val))

const objectColor = computed(() => {
  if (!props.selectedObject) return '#000000'
  const color = props.selectedObject.fill || '#000000'
  
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
  
  if (!apiKey.value) {
    showSettings.value = true
    const modelName = selectedModel.value === 'minimax' ? 'MiniMax' : 
                     selectedModel.value === 'kling' ? 'Kling' : 'LibLib'
    alert(`请先配置 ${modelName} API Key`)
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
  } finally {
    isGenerating.value = false
  }
}

const updateColor = (e) => {
  emit('update-property', { key: 'fill', value: e.target.value })
}

const formatThumbnail = (url) => {
  return url || ''
}

// Project Methods
const loadProjectsList = async () => {
  // Use local projects as cache/fallback
  const local = getLocalProjects()
  projects.value = local
  
  // Load from LeanCloud
  try {
    const cloudProjects = await getProjects()
    if (cloudProjects && cloudProjects.length > 0) {
      // Simple merge: cloud projects override local ones if needed, or just list them
      // Currently, we just replace the list with cloud projects for the full experience
      // or we can indicate which are local only.
      // For now, let's prioritize cloud projects.
      projects.value = cloudProjects
    }
  } catch (error) {
    console.error('加载云端项目失败:', error)
  }
}

const handleSaveProject = async () => {
  const name = window.prompt('请输入项目名称', `未命名项目 ${new Date().toLocaleDateString()}`)
  if (!name) return

  // Request canvas state from parent
  emit('get-canvas-state', async (state) => {
    try {
      isGenerating.value = true
      statusText.value = '正在同步到云端...'
      
      // Save locally first
      saveLocalProject(name, state.json, state.thumbnail)
      
      // Sync to LeanCloud
      await saveProject(name, state.json, state.thumbnail)
      
      await loadProjectsList()
      alert('已保存并同步到云端！')
    } catch (error) {
      console.error(error)
      alert('保存失败: ' + error.message)
    } finally {
      isGenerating.value = false
    }
  })
}

const handleLoadProject = async (project) => {
  console.log('Loading project:', project)
  try {
    isGenerating.value = true
    statusText.value = '正在加载设计...'
    
    // Always use loadFullProject which handles cloud fetching
    const json = await loadFullProject(project)
    
    if (json) {
      // Allow UI to update before heavy loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await emit('load-project', json)
    } else {
      throw new Error('未找到有效的画布数据')
    }
  } catch (error) {
    console.error('加载项目失败:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

const handleDeleteProject = async (id) => {
  if (!confirm('确定要删除这个项目吗？')) return
  try {
    // Delete local
    deleteLocalProject(id)
    // Delete cloud
    await deleteProject(id)
    
    await loadProjectsList()
  } catch (error) {
    console.error(error)
    alert('删除失败: ' + error.message)
  }
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
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #64748b;
  transition: all 0.2s;
}

.settings-btn:hover, .settings-btn.active {
  background: rgba(0, 0, 0, 0.05);
  color: #3b82f6;
}

.tab-switcher {
  display: flex;
  padding: 12px 24px;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
}

.settings-section {
  padding: 16px 24px;
  background: rgba(59, 130, 246, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.model-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  background: white;
  cursor: pointer;
}

.api-key-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-key-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
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
  width: 100%;
  padding: 8px 12px 8px 32px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  background: white;
}

.api-tip {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 4px 0 0;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  gap: 24px;
  overflow-y: auto;
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 0.95rem;
  max-width: 90%;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.ai-message {
  background: white;
  color: #1e293b;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.input-area-wrapper {
  padding: 16px 20px 24px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.input-area {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.input-area:focus-within {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px 6px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff;
  color: #3b82f6;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(59, 130, 246, 0.2);
  animation: tagAppear 0.2s ease-out;
  cursor: pointer;
  transition: all 0.2s;
}

.tag:hover {
  background: #dbeafe;
  transform: translateY(-1px);
}

.tag-edit {
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.2s;
}

.tag-edit:hover {
  opacity: 1;
  background: rgba(59, 130, 246, 0.1);
}

.name-input, .angle-input {
  width: 120px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.8rem;
  background: #f8fafc;
  outline: none;
  transition: all 0.2s;
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix .suffix {
  position: absolute;
  right: 8px;
  font-size: 0.75rem;
  color: #94a3b8;
  pointer-events: none;
}

.name-input:focus, .angle-input:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.multi-selection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.mini-property-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-property-card:hover {
  background: #f8fafc;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #334155;
  width: 100%;
}

.mini-delete-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.mini-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.obj-icon {
  color: #64748b;
}

.mini-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-input-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.input-with-suffix.small .angle-input {
  width: 60px;
  padding: 2px 6px;
  font-size: 0.75rem;
}

.input-with-suffix.small .suffix {
  right: 6px;
  font-size: 0.7rem;
}

@keyframes tagAppear {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.tag-icon {
  display: flex;
  align-items: center;
}

textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
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

.projects-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.save-project-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 2px dashed rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.05);
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-project-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.projects-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.project-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.project-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-thumb:hover .project-overlay {
  opacity: 1;
}

.project-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-project-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.delete-project-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.empty-projects {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: #94a3b8;
  gap: 12px;
}

.properties-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.property-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
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

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
