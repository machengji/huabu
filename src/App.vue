<template>
  <div class="app-container" :class="{ dark: isDark }">
    <!-- Top Header -->
    <header class="top-header glass-panel">
      <div class="left-section">
        <div class="logo">
          <span>Poster Studio</span>
        </div>
        <div class="header-divider"></div>
        <button class="nav-btn" @click="showProjectManager = true">
          <FolderOpen :size="18" />
          <span>我的项目</span>
        </button>
        <button class="nav-btn" @click="showAIPanel = !showAIPanel" :class="{ active: showAIPanel }">
          <Sparkles :size="18" />
          <span>AI 助手</span>
        </button>
      </div>
      
      <div class="center-section">
        <div class="zoom-controls">
          <button @click="zoomOut">-</button>
          <span>{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomIn">+</button>
        </div>
      </div>

      <div class="right-section">
        <button class="icon-btn" @click="isDark = !isDark">
          <Sun v-if="isDark" :size="20" />
          <Moon v-else :size="20" />
        </button>
        <button class="primary-btn" @click="handleExport">导出设计</button>
      </div>
    </header>

    <div class="main-layout">
      <!-- Left Toolbar -->
      <ToolBar @tool-click="handleToolClick" @action="handleAction" />

      <!-- Center Canvas -->
      <div class="canvas-area" ref="canvasArea">
        <CanvasEditor 
          ref="canvasRef"
          :zoom="zoom"
          @selection-change="handleSelectionChange"
          @zoom-change="zoom = $event"
          @interaction-start="handleCanvasInteractionStart"
          @interaction-end="handleCanvasInteractionEnd"
          @content-change="handleContentChange"
        />
      </div>

      <!-- Floating Object Toolbar -->
      <ObjectToolbar 
        v-if="selectedObject && !isInteracting"
        :selected-object="selectedObject"
        :canvas="canvasRef?.getCanvasInstance()"
        @action="handleObjectAction"
        @rotate-start="e => canvasRef.value.startRotatingObject(e)"
      />
      
      <!-- AI Panel (Floating) -->
      <AIPanel 
        v-model="showAIPanel"
        @generate="handleGenerate"
      />

      <AIGenerator 
        :show="showAIGenerator"
        :style="aiGeneratorPosition"
        @close="handleAIGeneratorClose"
        @generate="handleAIGenerate"
        @ratio-change="r => canvasRef.showAIGeneratorRect(true, r)"
      />
    </div>

    <!-- Project Manager Modal -->
    <ProjectManager 
      v-if="showProjectManager"
      @close="showProjectManager = false"
      @load-project="handleLoadProject"
      @get-canvas-state="handleGetCanvasState"
      @new-project="handleNewProject"
      @logout="handleLogout"
    />

    <!-- Hidden File Input for Image Upload -->
    <input 
      type="file" 
      ref="fileInput" 
      style="display: none" 
      accept="image/*" 
      multiple
      @change="handleImageUpload"
    >

    <!-- Hidden File Input for Video Upload -->
    <input 
      type="file" 
      ref="videoInput" 
      style="display: none" 
      accept="video/*" 
      @change="handleVideoUpload"
    >
    
    <LoginModal v-if="showLogin" @success="handleLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Sun, Moon, FolderOpen, Sparkles } from 'lucide-vue-next'
import ToolBar from './components/ToolBar.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import ObjectToolbar from './components/ObjectToolbar.vue'
import ProjectManager from './components/ProjectManager.vue'
import AIPanel from './components/AIPanel.vue'
import AIGenerator from './components/AIGenerator.vue'
import LoginModal from './components/LoginModal.vue'

import { generateImage } from './services/minimax'
import { generateImageKling } from './services/kling'
import { generateImageLibLib } from './services/liblib'
import { saveProject, getCurrentUser, createEmptyProject } from './services/leancloud'
import { saveLocalProject } from './services/localProjects'

const isDark = ref(false)
const zoom = ref(1)
const canvasRef = ref(null)
const selectedObject = ref(null)
const fileInput = ref(null)
const videoInput = ref(null)
const isInteracting = ref(false)

const showProjectManager = ref(false)
const showAIPanel = ref(false)
const showAIGenerator = ref(false)
const showLogin = ref(false)
const currentProject = ref(null)

onMounted(async () => {
    const user = getCurrentUser()
    if (!user) {
        showLogin.value = true
    } else {
        await initNewProjectSession()
    }
})

const handleLoginSuccess = async () => {
    showLogin.value = false
    await initNewProjectSession()
}

const handleLogout = () => {
    currentProject.value = null
    if (canvasRef.value) canvasRef.value.clearCanvas()
    showProjectManager.value = false
    showLogin.value = true
}

const initNewProjectSession = async () => {
    showProjectManager.value = true
}

const zoomIn = () => { zoom.value = Math.min(zoom.value + 0.1, 3) }
const zoomOut = () => { zoom.value = Math.max(zoom.value - 0.1, 0.1) }

const handleToolClick = (tool) => {
  // Logic for tool selection if needed
}

const handleAction = (action) => {
  if (!canvasRef.value) return
  
  if (typeof action === 'string') {
    switch (action) {
      case 'text':
        canvasRef.value.addToolElement('text')
        break
      case 'upload-image':
        fileInput.value.click()
        break
      case 'upload-video':
        videoInput.value.click()
        break
      case 'ai-canvas':
        showAIPanel.value = true
        break
      case 'ai-generator':
        showAIGenerator.value = true
        canvasRef.value.showAIGeneratorRect(true)
        // 初始位置设置在参考框下方
        setTimeout(handleCanvasInteractionEnd, 50)
        break
      case 'export':
        handleExport()
        break
    }
  } else if (action.type === 'add-shape') {
    canvasRef.value.addToolElement(action.shape)
  } else if (action.type === 'add-shape-text') {
    canvasRef.value.addShapeText(action.shape)
  }
}

const handleImageUpload = async (e) => {
  // ... existing handleImageUpload
}

const handleVideoUpload = async (e) => {
  const file = e.target.files[0]
  if (file && canvasRef.value) {
    const reader = new FileReader()
    reader.onload = async (f) => {
      const name = file.name.replace(/\.[^/.]+$/, "")
      await canvasRef.value.addVideo(f.target.result, name)
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

const handleSelectionChange = (obj) => {
  selectedObject.value = obj
}

const handleGenerate = async ({ prompt, apiKey, secretKey, model, pos }) => {
  if (canvasRef.value) {
    try {
      isInteracting.value = true
      let imageUrl
      
      if (model === 'minimax') {
        imageUrl = await generateImage(prompt, apiKey)
      } else if (model === 'kling') {
        imageUrl = await generateImageKling(prompt, apiKey, secretKey, (status) => {
          console.log('Kling Status:', status)
        })
      } else if (model === 'liblib') {
        imageUrl = await generateImageLibLib(prompt, apiKey, secretKey, (status) => {
          console.log('LibLib Status:', status)
        })
      }
      
      if (imageUrl) {
        // Use truncated prompt as name for AI images
        const aiName = `AI: ${prompt.slice(0, 8)}...`
        await canvasRef.value.addImage(imageUrl, aiName, pos)
      }
    } catch (error) {
      console.error('AI Generation Error:', error)
      alert(`生成失败: ${error.message}`)
    } finally {
      isInteracting.value = false
    }
  }
}

const handleAIGenerate = async (config) => {
  console.log('AI Generate Config:', config)
  
  const model = config.model === 'nano-banana-pro' ? 'minimax' : config.model
  const apiKey = localStorage.getItem(`${model}_api_key`)
  const secretKey = localStorage.getItem(`${model}_secret_key`)

  if (!apiKey) {
    alert(`请先在 AI 助手的设置中配置 ${model} 的 API Key`)
    showAIPanel.value = true
    return
  }

  // Get current AI rect position and size if exists
  const canvas = canvasRef.value.getCanvasInstance()
  const aiRect = canvas.getObjects().find(obj => obj.name === 'ai_gen_rect')
  const pos = aiRect ? { left: aiRect.left, top: aiRect.top, width: aiRect.getScaledWidth(), height: aiRect.getScaledHeight() } : null

  await handleGenerate({
    prompt: config.prompt,
    apiKey,
    secretKey,
    model,
    pos // Pass position to handleGenerate
  })
  
  showAIGenerator.value = false
  canvasRef.value.removeAIGeneratorRect()
}

const handleAIGeneratorClose = () => {
  showAIGenerator.value = false
  if (canvasRef.value) {
    canvasRef.value.removeAIGeneratorRect()
  }
}

const aiGeneratorPosition = ref({ left: '50%', top: 'auto', bottom: '40px' })

const handleCanvasInteractionStart = () => {
  isInteracting.value = true
  if (showAIGenerator.value) {
    // 拖动时隐藏面板
    aiGeneratorPosition.value = { ...aiGeneratorPosition.value, display: 'none' }
  }
}

const handleCanvasInteractionEnd = () => {
  isInteracting.value = false
  if (showAIGenerator.value && canvasRef.value) {
    const canvas = canvasRef.value.getCanvasInstance()
    const aiRect = canvas.getObjects().find(obj => obj.name === 'ai_gen_rect')
    if (aiRect) {
      aiRect.setCoords() 
      const boundingRect = aiRect.getBoundingRect()
      const zoom = canvas.getZoom()
      const vpt = canvas.viewportTransform
      
      const screenLeft = boundingRect.left * zoom + vpt[4]
      const screenTop = boundingRect.top * zoom + vpt[5]
      const screenWidth = boundingRect.width * zoom
      const screenHeight = boundingRect.height * zoom
      
      const screenCenterX = screenLeft + screenWidth / 2
      const screenBottomY = screenTop + screenHeight
      
      // 始终显示在下方，但如果超出画布底部，则向上偏移直到贴合画布底部
      const panelHeight = 180 
      const canvasHeight = canvas.height
      const margin = 20
      
      let finalTop = screenBottomY + margin
      
      // 检查是否超出画布底部
      if (finalTop + panelHeight > canvasHeight - 20) {
        // 如果超出，则强制固定在画布底部向上一点的位置，并覆盖在参考框末尾
        finalTop = canvasHeight - panelHeight - 20
      }

      aiGeneratorPosition.value = {
        left: `${screenCenterX}px`,
        top: `${finalTop}px`,
        bottom: 'auto',
        display: 'block'
      }
    }
  }
}

const handleExport = () => {
  if (canvasRef.value) {
    const dataUrl = canvasRef.value.exportCanvas()
    const link = document.createElement('a')
    link.download = 'my-poster.png'
    link.href = dataUrl
    link.click()
  }
}

const handleObjectAction = (action) => {
  console.log('Object action:', action)
  if (action === 'download') {
    handleExport()
  } else if (action === 'rotate') {
    canvasRef.value.rotateSelectedObject(90)
  } else if (action === 'delete') {
    canvasRef.value.deleteSelectedObject()
  } else if (action === 'rename') {
    const oldName = selectedObject.value.name || '未命名元素'
    const newName = window.prompt('修改元素名称', oldName)
    if (newName && newName !== oldName) {
      canvasRef.value.updateSelectedObject('name', newName)
      // Force update selectedObject to refresh UI
      selectedObject.value = { ...selectedObject.value, name: newName }
    }
  } else {
    alert(`功能 [${action}] 正在集成中...`)
  }
}

const handleLoadProject = async (data) => {
  // Support both old format (direct json) and new format (object)
  const json = data.json || data
  if (canvasRef.value) {
    await canvasRef.value.loadFromJSON(json)
    
    // Set current project context for auto-save
    if (data.projectId) {
        currentProject.value = {
            projectId: data.projectId,
            name: data.name,
            isLocal: !!data.isLocal
        }
        console.log('Project loaded:', currentProject.value.name)
    }
  }
}

const handleContentChange = async (state) => {
  // console.log('App received content-change. Current Project:', currentProject.value)
  
  // If no project is active, create one automatically on first edit
  if (!currentProject.value || !currentProject.value.projectId) {
      console.log('No active project. Auto-creating new cloud project for these changes...')
      try {
          const project = await createEmptyProject()
          currentProject.value = {
              projectId: project.id,
              name: project.name,
              isLocal: false
          }
      } catch (e) {
          console.error('Failed to auto-create project:', e)
          return
      }
  }

  // Auto-save logic
  try {
    if (currentProject.value.isLocal) {
        saveLocalProject(currentProject.value.name, state.json, state.thumbnail)
    } else {
        // Cloud Save
        await saveProject(currentProject.value.name, state.json, state.thumbnail, currentProject.value.projectId)
    }
    // console.log('Auto-saved')
  } catch (error) {
    console.error('Auto-save failed:', error)
  }
}

const handleGetCanvasState = (callback) => {
  if (canvasRef.value) {
    const state = canvasRef.value.getCanvasState()
    callback(state)
  }
}

const handleNewProject = async () => {
    if(canvasRef.value) {
        // 1. Force save current project if exists
        if (currentProject.value && currentProject.value.projectId) {
            console.log('Switching projects: Force saving current project...')
            try {
                // Access component method directly
                const state = canvasRef.value.getCanvasState()
                if (state) {
                    await saveProject(
                        currentProject.value.name, 
                        state.json, 
                        state.thumbnail, 
                        currentProject.value.projectId
                    )
                    console.log('Previous project saved.')
                }
            } catch (e) {
                console.error('Failed to save previous project before new:', e)
            }
        }

        // 2. Clear and Create New
        canvasRef.value.clearCanvas()
        
        try {
            const project = await createEmptyProject()
            currentProject.value = {
                projectId: project.id,
                name: project.name,
                isLocal: false
            }
            console.log('New cloud project created:', project.name)
        } catch (e) {
            console.error('Failed to init cloud project:', e)
        }
    }
}
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9;
  transition: background-color 0.3s ease;
}

.app-container.dark {
  background-color: #020617;
  color: #f8fafc;
}

.top-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  color: #3b82f6;
}

.left-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-divider {
    width: 1px;
    height: 24px;
    background: rgba(0,0,0,0.1);
}

.dark .header-divider {
    background: rgba(255,255,255,0.1);
}

.nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    color: #64748b;
    font-weight: 600;
    transition: all 0.2s;
}

.nav-btn:hover, .nav-btn.active {
    background: rgba(0,0,0,0.05);
    color: #1e293b;
}

.dark .nav-btn:hover, .dark .nav-btn.active {
    background: rgba(255,255,255,0.1);
    color: #f8fafc;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.dark .zoom-controls {
  background: rgba(255, 255, 255, 0.1);
}

.zoom-controls button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 1.2rem;
  color: inherit;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  padding-left: 0;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
}

.dark .canvas-area {
  background-image: radial-gradient(#1e293b 1px, transparent 1px);
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .icon-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.primary-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.right-section {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>

