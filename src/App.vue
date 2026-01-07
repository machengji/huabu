<template>
  <div class="app-container" :class="{ dark: isDark }">
    <!-- Top Header -->
    <header class="top-header glass-panel">
      <div class="left-section">
        <div class="logo">
          <div class="logo-icon"></div>
          <span>AI Poster Studio</span>
        </div>
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
          @interaction-start="isInteracting = true"
          @interaction-end="isInteracting = false"
        />
      </div>

      <!-- Right Side Panel -->
      <SidePanel 
        :selected-object="selectedObject"
        @generate="handleGenerate"
        @update-property="handleUpdateProperty"
      />

      <!-- Floating Object Toolbar -->
      <ObjectToolbar 
        v-if="selectedObject && !isInteracting"
        :selected-object="selectedObject"
        :canvas="canvasRef?.getCanvasInstance()"
        @action="handleObjectAction"
      />
    </div>
    <!-- Hidden File Input for Image Upload -->
    <input 
      type="file" 
      ref="fileInput" 
      style="display: none" 
      accept="image/*" 
      @change="handleImageUpload"
    >
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'
import ToolBar from './components/ToolBar.vue'
import SidePanel from './components/SidePanel.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import ObjectToolbar from './components/ObjectToolbar.vue'

const isDark = ref(false)
const zoom = ref(1)
const canvasRef = ref(null)
const selectedObject = ref(null)
const fileInput = ref(null)
const isInteracting = ref(false)

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
      case 'ai-canvas':
        alert('智能画板功能：AI 将根据当前画布内容生成新的创意元素')
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

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (file && canvasRef.value) {
    const reader = new FileReader()
    reader.onload = (f) => {
      canvasRef.value.addImage(f.target.result)
    }
    reader.readAsDataURL(file)
  }
  // Reset input
  e.target.value = ''
}

const handleSelectionChange = (obj) => {
  selectedObject.value = obj
}

const handleGenerate = async (prompt) => {
  if (canvasRef.value) {
    await canvasRef.value.generatePoster(prompt)
  }
}

const handleUpdateProperty = ({ key, value }) => {
  if (canvasRef.value) {
    canvasRef.value.updateSelectedObject(key, value)
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
  // Implement specific actions like remove-bg, upscale etc.
  if (action === 'download') {
    handleExport()
  } else {
    alert(`功能 [${action}] 正在集成中...`)
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
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 8px;
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
