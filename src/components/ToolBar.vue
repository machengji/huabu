<template>
  <div class="toolbar-container">
    <div class="toolbar glass-panel">
      <!-- Select Tool -->
      <div class="tool-item">
        <button 
          class="tool-btn" 
          :class="{ active: activeTool === 'select' }"
          @click="setActiveTool('select')"
          title="选择"
        >
          <MousePointer2 :size="20" />
        </button>
      </div>

      <!-- Add Tool (Popup) -->
      <div class="tool-item" v-click-outside="() => showAddPopup = false">
        <button 
          class="tool-btn" 
          @click="showAddPopup = !showAddPopup"
          title="新增"
        >
          <Plus :size="20" />
        </button>
        <div v-if="showAddPopup" class="popup-menu glass-panel">
          <div class="popup-header">新增</div>
          <button class="popup-item" @click="handleAction('upload-image')">
            <ImageIcon :size="18" />
            <span>上传图片</span>
          </button>
          <button class="popup-item" @click="handleAction('upload-video')">
            <Video :size="18" />
            <span>上传视频</span>
          </button>
          <button class="popup-item" @click="handleAction('ai-generator')">
            <Sparkles :size="18" />
            <span>图像生成器</span>
          </button>
          <button class="popup-item" @click="handleAction('ai-canvas')">
            <Hash :size="18" />
            <span>智能画板</span>
            <span class="shortcut">F</span>
          </button>
        </div>
      </div>

      <!-- Shape Tool (Popup) -->
      <div class="tool-item" v-click-outside="() => showShapePopup = false">
        <button 
          class="tool-btn" 
          :class="{ active: activeTool === 'shape' }"
          @click="showShapePopup = !showShapePopup"
          title="形状"
        >
          <Square :size="20" />
        </button>
        <div v-if="showShapePopup" class="popup-menu shape-popup glass-panel">
          <div class="popup-section">
            <div class="popup-header">形状</div>
            <div class="shape-grid">
              <button @click="addShape('rect')"><Square :size="20" /></button>
              <button @click="addShape('circle')"><Circle :size="20" /></button>
              <button @click="addShape('triangle')"><Triangle :size="20" /></button>
              <button @click="addShape('star')"><Star :size="20" /></button>
            </div>
          </div>
          <div class="popup-section">
            <div class="popup-header">形状文本</div>
            <div class="shape-grid">
              <button @click="addShapeText('rect')"><Square :size="20" /></button>
              <button @click="addShapeText('circle')"><Circle :size="20" /></button>
              <button @click="addShapeText('chat')"><MessageSquare :size="20" /></button>
              <button @click="addShapeText('arrow-left')"><ArrowLeft :size="20" /></button>
              <button @click="addShapeText('arrow-right')"><ArrowRight :size="20" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Text Tool -->
      <div class="tool-item tooltip-trigger">
        <button 
          class="tool-btn" 
          :class="{ active: activeTool === 'text' }"
          @click="handleAction('text')"
        >
          <Type :size="20" />
        </button>
        <div class="tooltip">文字 <span class="shortcut-key">T</span></div>
      </div>

      <!-- Pen Tool -->
      <div class="tool-item">
        <button class="tool-btn" title="画笔">
          <Pencil :size="20" />
        </button>
      </div>

      <div class="divider"></div>

      <!-- Assets Tool -->
      <div class="tool-item">
        <button class="tool-btn" title="素材">
          <LayoutGrid :size="20" />
        </button>
      </div>

      <!-- Export Tool -->
      <div class="tool-item">
        <button class="tool-btn" title="导出" @click="handleAction('export')">
          <Share2 :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  MousePointer2, Plus, Square, Circle, Triangle, Star, 
  Type, Pencil, LayoutGrid, Share2, Image as ImageIcon, 
  Video, Hash, MessageSquare, ArrowLeft, ArrowRight, Sparkles 
} from 'lucide-vue-next'

const emit = defineEmits(['tool-click', 'action'])

const activeTool = ref('select')
const showAddPopup = ref(false)
const showShapePopup = ref(false)

const setActiveTool = (tool) => {
  activeTool.value = tool
  emit('tool-click', tool)
}

const handleAction = (action) => {
  emit('action', action)
  showAddPopup.value = false
  if (action === 'text') setActiveTool('text')
}

const addShape = (type) => {
  emit('action', { type: 'add-shape', shape: type })
  showShapePopup.value = false
}

const addShapeText = (type) => {
  emit('action', { type: 'add-shape-text', shape: type })
  showShapePopup.value = false
}

// Simple click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>

<style scoped>
.toolbar-container {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 20px;
  width: 56px;
  align-items: center;
}

.tool-item {
  position: relative;
}

.tool-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 12px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.tool-btn:hover, .tool-btn.active {
  background-color: #f1f5f9;
  color: #1e293b;
}

.dark .tool-btn:hover, .dark .tool-btn.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.divider {
  width: 24px;
  height: 1px;
  background: rgba(0, 0, 0, 0.05);
  margin: 4px 0;
}

.dark .divider {
  background: rgba(255, 255, 255, 0.1);
}

/* Popup Menu */
.popup-menu {
  position: absolute;
  left: 64px;
  top: 0;
  width: 200px;
  padding: 12px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.popup-header {
  font-size: 0.8rem;
  color: #94a3b8;
  padding: 4px 8px;
  margin-bottom: 4px;
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  color: #1e293b;
  font-size: 0.95rem;
  transition: background 0.2s;
  width: 100%;
  text-align: left;
}

.dark .popup-item {
  color: #f1f5f9;
}

.popup-item:hover {
  background: #f8fafc;
}

.dark .popup-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.shortcut {
  margin-left: auto;
  color: #94a3b8;
  font-size: 0.8rem;
}

/* Shape Popup */
.shape-popup {
  width: 240px;
}

.popup-section {
  margin-bottom: 12px;
}

.popup-section:last-child {
  margin-bottom: 0;
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 4px;
}

.shape-grid button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s;
}

.dark .shape-grid button {
  color: #cbd5e1;
}

.shape-grid button:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.dark .shape-grid button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

/* Tooltip */
.tooltip-trigger:hover .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.tooltip {
  position: absolute;
  left: 64px;
  top: 50%;
  transform: translateY(-50%) translateX(-10px);
  background: #1e293b;
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.shortcut-key {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>
