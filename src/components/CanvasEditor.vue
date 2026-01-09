<template>
  <div class="canvas-container-wrapper" ref="wrapper">
    <canvas id="c" ref="canvasEl"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as fabric from 'fabric'

const props = defineProps({
  zoom: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['selection-change', 'zoom-change', 'interaction-start', 'interaction-end'])

const canvasEl = ref(null)
const wrapper = ref(null)
let canvas = null

const deleteSelectedObject = () => {
  if (!canvas) return
  const activeObjects = canvas.getActiveObjects()
  if (activeObjects.length > 0) {
    canvas.discardActiveObject()
    activeObjects.forEach((obj) => {
      canvas.remove(obj)
    })
    canvas.requestRenderAll()
    emit('selection-change', null)
  }
}

onMounted(() => {
  const resizeCanvas = () => {
    if (wrapper.value && canvas) {
      canvas.setDimensions({
        width: wrapper.value.clientWidth,
        height: wrapper.value.clientHeight
      })
      canvas.renderAll()
    }
  }

  canvas = new fabric.Canvas(canvasEl.value, {
    width: wrapper.value.clientWidth,
    height: wrapper.value.clientHeight,
    backgroundColor: 'transparent',
    preserveObjectStacking: true
  })

  // Customize Fabric.js selection controls
  fabric.Object.prototype.set({
    transparentCorners: false,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#3b82f6',
    borderColor: '#3b82f6',
    cornerSize: 12,
    cornerStyle: 'circle',
    borderDashArray: [3, 3],
    padding: 0,
    hasRotatingPoint: true,
    borderScaleFactor: 2
  })

  // Ensure rotation control is at the top
  if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
    fabric.Object.prototype.controls.mtr.y = -0.5
    fabric.Object.prototype.controls.mtr.offsetY = -40
  }

  canvas.on('object:added', (e) => {
    if (e.target) {
      e.target.set({
        cornerColor: '#ffffff',
        cornerStrokeColor: '#3b82f6',
        borderColor: '#3b82f6',
        cornerSize: 12,
        cornerStyle: 'circle',
        transparentCorners: false,
        hasRotatingPoint: true
      })
    }
  })

  window.addEventListener('resize', resizeCanvas)

  // Listen for selection events
  canvas.on('selection:created', () => emit('selection-change', canvas.getActiveObject()))
  canvas.on('selection:updated', () => emit('selection-change', canvas.getActiveObject()))
  canvas.on('selection:cleared', () => emit('selection-change', null))

  // Interaction events
  canvas.on('object:moving', () => emit('interaction-start'))
  canvas.on('object:scaling', () => emit('interaction-start'))
  canvas.on('object:rotating', () => {
    emit('interaction-start')
    emit('selection-change', canvas.getActiveObject())
  })

  // Spacebar Panning & Ctrl Selection logic
  let isPanning = false
  let isSpacePressed = false

  const handleKeyDown = (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      canvas.selectionKey = 'ctrlKey'
    }
    if (e.code === 'Space' && !isSpacePressed) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
      isSpacePressed = true
      canvas.defaultCursor = 'grab'
      canvas.setCursor('grab')
      canvas.selection = false
      canvas.skipTargetFind = true
      canvas.renderAll()
    }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
      deleteSelectedObject()
    }
  }

  const handleKeyUp = (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      canvas.selectionKey = 'shiftKey'
    }
    if (e.code === 'Space') {
      isSpacePressed = false
      isPanning = false
      canvas.defaultCursor = 'default'
      canvas.setCursor('default')
      canvas.selection = true
      canvas.skipTargetFind = false
      canvas.renderAll()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  canvas.on('mouse:down', (opt) => {
    if (isSpacePressed) {
      isPanning = true
      canvas.setCursor('grabbing')
    }
    if (opt.target) emit('interaction-start')
  })

  canvas.on('mouse:move', (opt) => {
    if (isPanning && opt.e) {
      const delta = new fabric.Point(opt.e.movementX, opt.e.movementY)
      canvas.relativePan(delta)
    }
  })

  canvas.on('mouse:up', () => {
    if (isSpacePressed) {
      isPanning = false
      canvas.setCursor('grab')
    }
    emit('interaction-end')
  })

  canvas.on('mouse:wheel', (opt) => {
    if (opt.e.ctrlKey) {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      if (zoom > 20) zoom = 20
      if (zoom < 0.01) zoom = 0.01
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
      opt.e.preventDefault()
      opt.e.stopPropagation()
      emit('zoom-change', zoom)
    }
  })

  canvas.renderAll()
})

onUnmounted(() => {
  if (canvas) {
    canvas.dispose()
  }
  window.removeEventListener('resize', () => {})
})

watch(() => props.zoom, (newZoom) => {
  if (canvas) {
    canvas.setZoom(newZoom)
  }
})

const addToolElement = (tool) => {
  if (!canvas) return
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  let obj
  switch (tool) {
    case 'text':
      obj = new fabric.Textbox('输入文字', {
        left: centerX, top: centerY, originX: 'center', originY: 'center',
        width: 200, fontSize: 30, textAlign: 'center', fill: '#1e293b',
        fontFamily: 'Inter', fontWeight: 'bold', name: '文字'
      })
      break
    case 'rect':
      obj = new fabric.Rect({
        left: centerX, top: centerY, originX: 'center', originY: 'center',
        width: 100, height: 100, fill: '#3b82f6', rx: 12, ry: 12, name: '矩形'
      })
      break
    case 'circle':
      obj = new fabric.Circle({
        left: centerX, top: centerY, originX: 'center', originY: 'center',
        radius: 50, fill: '#8b5cf6', name: '圆形'
      })
      break
  }
  if (obj) {
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
  }
}

const updateSelectedObject = (key, value) => {
  const activeObj = canvas.getActiveObject()
  if (activeObj) {
    if (activeObj.type === 'activeSelection') {
      activeObj.getObjects().forEach(obj => obj.set(key, value))
    } else {
      activeObj.set(key, value)
    }
    canvas.requestRenderAll()
  }
}

const updateObject = (obj, key, value) => {
  if (!canvas || !obj) return
  obj.set(key, value)
  canvas.requestRenderAll()
}

let imageCounter = 1
let lastPlacedRect = null

const addImage = async (url, customName = null) => {
  if (!canvas) return
  try {
    const isDataUrl = url.startsWith('data:')
    const img = await fabric.FabricImage.fromURL(url, { crossOrigin: isDataUrl ? null : 'anonymous' })
    const targetWidth = 200
    const scale = targetWidth / img.width
    const scaledWidth = targetWidth
    const scaledHeight = img.height * scale
    let posX = canvas.width / 2, posY = canvas.height / 2
    if (lastPlacedRect) {
      posX = lastPlacedRect.left + lastPlacedRect.width / 2 + scaledWidth / 2 + 20
      posY = lastPlacedRect.top
      if (posX + scaledWidth / 2 > canvas.width - 50) {
        posX = canvas.width / 2
        posY = lastPlacedRect.top + lastPlacedRect.height / 2 + scaledHeight / 2 + 20
      }
    }
    
    // Use custom name if provided, otherwise default to "图片 X"
    const name = customName || `图片 ${imageCounter++}`
    
    img.set({ left: posX, top: posY, originX: 'center', originY: 'center', scaleX: scale, scaleY: scale, name })
    lastPlacedRect = { left: posX, top: posY, width: scaledWidth, height: scaledHeight }
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
  } catch (e) { console.error('Failed to add image', e) }
}

const exportCanvas = () => canvas ? canvas.toDataURL({ format: 'png', quality: 1 }) : ''
const getCanvasInstance = () => canvas
const getCanvasState = () => {
  if (!canvas) return null
  return {
    json: canvas.toJSON(),
    thumbnail: canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 500 / canvas.width })
  }
}
const locateObject = (obj) => {
  if (!canvas || !obj) return
  
  // Check if the object is currently part of the active selection (single or multi)
  const currentActiveObjects = canvas.getActiveObjects()
  const isSelected = currentActiveObjects.includes(obj)
  
  // Only change selection if it's NOT already selected
  if (!isSelected) {
    canvas.setActiveObject(obj)
  }

  // Center the object in the viewport
  const vpt = canvas.viewportTransform
  const zoom = canvas.getZoom()
  const objCenter = obj.getCenterPoint()
  
  canvas.relativePan(new fabric.Point(
    canvas.width / 2 - (objCenter.x * zoom + vpt[4]),
    canvas.height / 2 - (objCenter.y * zoom + vpt[5])
  ))
  
  canvas.renderAll()
}

const removeObject = (obj) => {
  if (!canvas || !obj) return
  
  // If object is in a group/selection, we need to remove it from there first
  const activeObj = canvas.getActiveObject()
  if (activeObj && activeObj.type === 'activeSelection' && activeObj.getObjects().includes(obj)) {
    activeObj.removeWithUpdate(obj)
    
    // If selection becomes empty or single, Fabric handles it, but let's check
    if (activeObj.size() === 0) {
      canvas.discardActiveObject()
    } else if (activeObj.size() === 1) {
      // Optional: switch to single selection or keep it
    }
  }
  
  canvas.remove(obj)
  canvas.requestRenderAll()
  
  // Emit change to update UI
  emit('selection-change', canvas.getActiveObject())
}

const loadFromJSON = async (json) => {
  if (!canvas) return
  try {
    await canvas.loadFromJSON(json)
    const images = canvas.getObjects('image')
    if (images.length > 0) {
      const maxNum = Math.max(...images.map(img => {
        const match = img.name?.match(/图片 (\d+)/)
        return match ? parseInt(match[1]) : 0
      }))
      imageCounter = maxNum + 1
    }
    canvas.renderAll()
  } catch (e) { console.error('Failed to load project:', e) }
}

defineExpose({
  addToolElement, generatePoster: () => {}, updateSelectedObject, addImage, exportCanvas,
  getCanvasInstance, getCanvasState, loadFromJSON, deleteSelectedObject, locateObject, updateObject, removeObject
})
</script>

<style scoped>
.canvas-container-wrapper { width: 100%; height: 100%; overflow: hidden; }
</style>
