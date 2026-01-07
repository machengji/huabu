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

  window.addEventListener('resize', resizeCanvas)

  // Listen for selection events
  canvas.on('selection:created', (e) => emit('selection-change', e.selected[0]))
  canvas.on('selection:updated', (e) => emit('selection-change', e.selected[0]))
  canvas.on('selection:cleared', () => emit('selection-change', null))

  // Interaction events for hiding toolbar
  canvas.on('object:moving', () => emit('interaction-start'))
  canvas.on('object:scaling', () => emit('interaction-start'))
  canvas.on('object:rotating', () => emit('interaction-start'))
  canvas.on('mouse:down', (opt) => {
    if (opt.target) emit('interaction-start')
  })
  canvas.on('mouse:up', () => emit('interaction-end'))

  // Initial render
  canvas.renderAll()

  // Spacebar Panning Implementation
  let isPanning = false
  let isSpacePressed = false

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isSpacePressed) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
      
      isSpacePressed = true
      canvas.defaultCursor = 'grab'
      canvas.setCursor('grab')
      
      // Disable all object selection and events to allow canvas panning
      canvas.selection = false
      canvas.skipTargetFind = true // This is key: ignore objects under mouse
      canvas.renderAll()
    }
  })

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false
      isPanning = false
      canvas.defaultCursor = 'default'
      canvas.setCursor('default')
      
      // Restore selection and object interaction
      canvas.selection = true
      canvas.skipTargetFind = false
      canvas.renderAll()
    }
  })

  canvas.on('mouse:down', (opt) => {
    if (isSpacePressed) {
      isPanning = true
      canvas.setCursor('grabbing')
    }
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
  })

  // Ctrl + Mouse Wheel Zooming
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
      
      // Emit zoom change to parent to sync UI
      emit('zoom-change', zoom)
    }
  })
})

onUnmounted(() => {
  if (canvas) {
    canvas.dispose()
  }
  window.removeEventListener('resize', () => {})
})

// Watch for zoom changes
watch(() => props.zoom, (newZoom) => {
  if (canvas) {
    canvas.setZoom(newZoom)
  }
})

// Tools implementation
const addToolElement = (tool) => {
  if (!canvas) return
  
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  let obj
  
  switch (tool) {
    case 'text':
      obj = new fabric.Textbox('输入文字', {
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        width: 200,
        fontSize: 30,
        textAlign: 'center',
        fill: '#1e293b',
        fontFamily: 'Inter',
        fontWeight: 'bold'
      })
      break
    case 'rect':
      obj = new fabric.Rect({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        width: 100,
        height: 100,
        fill: '#3b82f6',
        rx: 12,
        ry: 12
      })
      break
    case 'circle':
      obj = new fabric.Circle({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        radius: 50,
        fill: '#8b5cf6'
      })
      break
    case 'triangle':
      obj = new fabric.Triangle({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        width: 100,
        height: 100,
        fill: '#10b981'
      })
      break
    case 'star':
      // Simple 5-point star centered at 0,0 for correct origin
      obj = new fabric.Polygon([
        {x: 0, y: -50}, {x: 11, y: -15}, {x: 48, y: -15}, {x: 18, y: 7},
        {x: 29, y: 41}, {x: 0, y: 20}, {x: -29, y: 41}, {x: -18, y: 7},
        {x: -48, y: -15}, {x: -11, y: -15}
      ], {
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        fill: '#f59e0b'
      })
      break
  }
  
  if (obj) {
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
  }
}

const addShapeText = (type) => {
  if (!canvas) return
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  
  // For simplicity, we'll create a group or just a shape with a text on top
  // Fabric.js 7.x doesn't have a built-in "ShapeText" but we can group them
  let shape
  switch (type) {
    case 'rect':
      shape = new fabric.Rect({ width: 150, height: 60, fill: '#e2e8f0', rx: 8, ry: 8 })
      break
    case 'circle':
      shape = new fabric.Circle({ radius: 50, fill: '#e2e8f0' })
      break
    case 'chat':
      // Simple chat bubble path
      shape = new fabric.Path('M 0 0 L 100 0 L 100 70 L 30 70 L 10 90 L 10 70 L 0 70 Z', {
        fill: '#e2e8f0'
      })
      break
    default:
      shape = new fabric.Rect({ width: 100, height: 50, fill: '#e2e8f0' })
  }
  
  const text = new fabric.Textbox('文字', {
    fontSize: 18,
    textAlign: 'center',
    width: shape.width || 100,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  })
  
  // Set shape origin to center for grouping
  shape.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  })
  
  const group = new fabric.Group([shape, text], {
    left: centerX,
    top: centerY,
    originX: 'center',
    originY: 'center'
  })
  
  canvas.add(group)
  canvas.setActiveObject(group)
  canvas.renderAll()
}

// AI Generation logic
const generatePoster = async (prompt) => {
  // Mock AI Logic
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const isSnakeYear = prompt.includes('蛇') || prompt.includes('春节') || prompt.includes('新年')
  
  let data
  if (isSnakeYear) {
    data = {
      background: { url: '/assets/bg.png' },
      elements: [
        { type: 'text', content: '2026 蛇年大吉', color: '#FFD700', fontSize: 60, top: 120, left: 50, width: 400 },
        { type: 'image', url: '/assets/snake.png', top: 280, left: 100, width: 300 },
        { type: 'text', content: '灵蛇献瑞 · 万事如意', color: '#FFFFFF', fontSize: 28, top: 620, left: 50, width: 400 }
      ]
    }
  } else {
    data = {
      background: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
      elements: [
        { type: 'text', content: 'AI DESIGN', color: '#1e293b', fontSize: 70, top: 150, left: 50, width: 400 },
        { type: 'text', content: '智能排版 · 极简主义', color: '#334155', fontSize: 24, top: 260, left: 50, width: 400 }
      ]
    }
  }

  // Clear and Render
  canvas.getObjects().forEach(obj => canvas.remove(obj))
  
  if (data.background.url) {
    try {
      const isLocal = data.background.url.startsWith('/')
      const img = await fabric.FabricImage.fromURL(data.background.url, { 
        crossOrigin: isLocal ? null : 'anonymous' 
      })
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: canvas.width / 2,
        top: canvas.height / 2,
        selectable: false,
        evented: false
      })
      canvas.backgroundImage = img
    } catch (e) {
      console.error('Background load failed', e)
    }
  }

  for (const item of data.elements) {
    if (item.type === 'text') {
      const text = new fabric.Textbox(item.content, {
        top: item.top,
        left: item.left,
        width: item.width,
        fontSize: item.fontSize,
        fill: item.color,
        textAlign: 'center',
        fontFamily: 'Inter',
        fontWeight: 'bold',
        cornerColor: '#3b82f6',
        cornerSize: 10,
        transparentCorners: false
      })
      canvas.add(text)
    } else if (item.type === 'image') {
      try {
        const isLocal = item.url.startsWith('/')
        const img = await fabric.FabricImage.fromURL(item.url, { 
          crossOrigin: isLocal ? null : 'anonymous' 
        })
        img.set({
          top: item.top,
          left: item.left,
          scaleX: item.width / img.width,
          scaleY: item.width / img.width,
          cornerColor: '#3b82f6',
          cornerSize: 10,
          transparentCorners: false
        })
        canvas.add(img)
      } catch (e) {
        console.error('Element image load failed', e)
      }
    }
  }
  canvas.renderAll()
}

const updateSelectedObject = (key, value) => {
  const activeObj = canvas.getActiveObject()
  if (activeObj) {
    activeObj.set(key, value)
    canvas.renderAll()
  }
}

let lastPlacedRect = null

const addImage = async (url) => {
  if (!canvas) return
  try {
    const isDataUrl = url.startsWith('data:')
    const img = await fabric.FabricImage.fromURL(url, { 
      crossOrigin: isDataUrl ? null : 'anonymous' 
    })
    
    // Calculate scale to fit within 200px width for grid-like placement
    const targetWidth = 200
    const scale = targetWidth / img.width
    const scaledWidth = targetWidth
    const scaledHeight = img.height * scale
    
    let posX, posY
    
    if (!lastPlacedRect) {
      // First image at center
      posX = canvas.width / 2
      posY = canvas.height / 2
    } else {
      // Place to the right of last image
      posX = lastPlacedRect.left + lastPlacedRect.width / 2 + scaledWidth / 2 + 20
      posY = lastPlacedRect.top
      
      // If exceeds width, move to next row
      if (posX + scaledWidth / 2 > canvas.width - 50) {
        posX = canvas.width / 2
        posY = lastPlacedRect.top + lastPlacedRect.height / 2 + scaledHeight / 2 + 20
      }
      
      // If exceeds height, reset to center
      if (posY + scaledHeight / 2 > canvas.height - 50) {
        posX = canvas.width / 2
        posY = canvas.height / 2
      }
    }
    
    img.set({
      left: posX,
      top: posY,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      cornerColor: '#3b82f6',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3b82f6',
      borderScaleFactor: 2
    })
    
    lastPlacedRect = {
      left: posX,
      top: posY,
      width: scaledWidth,
      height: scaledHeight
    }
    
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
  } catch (e) {
    console.error('Failed to add image', e)
  }
}

const exportCanvas = () => {
  if (!canvas) return ''
  // Export at high quality
  return canvas.toDataURL({
    format: 'png',
    quality: 1
  })
}

const getCanvasInstance = () => canvas

defineExpose({
  addToolElement,
  addShapeText,
  generatePoster,
  updateSelectedObject,
  addImage,
  exportCanvas,
  getCanvasInstance
})
</script>

<style scoped>
.canvas-container-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
