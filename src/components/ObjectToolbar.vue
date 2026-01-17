<template>
  <div 
    v-if="selectedObject" 
    class="object-toolbar glass-panel"
    :style="toolbarStyle"
  >
    <template v-if="isImage">
      <button class="tool-item" @click="$emit('action', 'upscale')">
        <Maximize2 :size="16" />
        <span>放大</span>
      </button>
      <button class="tool-item" @click="$emit('action', 'remove-bg')">
        <Eraser :size="16" />
        <span>移除背景</span>
      </button>
      <button class="tool-item" @click="$emit('action', 'mockup')">
        <Shirt :size="16" />
        <span>Mockup</span>
      </button>
      <button class="tool-item" @click="$emit('action', 'erase')">
        <Brush :size="16" />
        <span>擦除</span>
      </button>
      <button class="tool-item" @click="$emit('action', 'edit-element')">
        <Layers :size="16" />
        <span>编辑元素</span>
      </button>
      <button class="tool-item" @click="$emit('action', 'expand')">
        <Expand :size="16" />
        <span>扩展</span>
      </button>
      <div class="divider"></div>
    </template>

    <button v-if="selectedObject.type === 'textbox'" class="tool-item" @click="$emit('action', 'edit-text')">
      <Type :size="16" />
      <span>编辑文字</span>
      <span class="badge">New</span>
    </button>

    <button 
      v-if="selectedObject.type !== 'activeSelection'" 
      class="tool-item icon-only" 
      @click="$emit('action', 'download')"
    >
      <Download :size="16" />
    </button>
    <button 
      v-if="selectedObject.type !== 'activeSelection'" 
      class="tool-item icon-only" 
      @click="$emit('action', 'rename')"
    >
      <Edit3 :size="16" />
    </button>
    <div class="divider"></div>
    <button class="tool-item icon-only danger" @click="$emit('action', 'delete')">
      <Trash2 :size="16" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  Maximize2, Eraser, Shirt, Brush, Layers, 
  Type, Expand, MoreHorizontal, Download, Trash2, Edit3, RotateCw 
} from 'lucide-vue-next'

const props = defineProps({
  selectedObject: Object,
  canvas: Object
})

defineEmits(['action'])

const isImage = computed(() => {
  return props.selectedObject && (props.selectedObject.type === 'image' || props.selectedObject.type === 'fabric.Image')
})

const toolbarStyle = computed(() => {
  if (!props.selectedObject || !props.canvas) return {}
  
  // Get object position in canvas coordinates
  const obj = props.selectedObject
  const boundingRect = obj.getBoundingRect()
  
  // Convert to viewport coordinates
  const zoom = props.canvas.getZoom()
  const vpt = props.canvas.viewportTransform
  
  const left = boundingRect.left * zoom + vpt[4]
  const top = boundingRect.top * zoom + vpt[5]
  const width = boundingRect.width * zoom
  
  return {
    left: `${left + width / 2}px`,
    top: `${top - 65}px`,
    transform: 'translate(-50%, 0)'
  }
})
</script>

<style scoped>
.object-toolbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  white-space: nowrap;
  pointer-events: auto;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  color: #1e293b;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.2s;
  position: relative;
}

.dark .tool-item {
  color: #f1f5f9;
}

.tool-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dark .tool-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tool-item.icon-only {
  padding: 6px;
}

.tool-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 4px;
}

.dark .divider {
  background: rgba(255, 255, 255, 0.2);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #3b82f6;
  color: white;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
