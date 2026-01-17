<template>
  <div class="canvas-container-wrapper" ref="wrapper">
    <canvas id="c" ref="canvasEl"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as fabric from 'fabric'
import { uploadFile } from '../services/leancloud'

const props = defineProps({
  zoom: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['selection-change', 'zoom-change', 'interaction-start', 'interaction-end', 'content-change'])

const canvasEl = ref(null)
const wrapper = ref(null)
let canvas = null

// Debounce helper
const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

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
    hasRotatingPoint: false,
    borderScaleFactor: 2
  })

  // Hide default rotation control globally
  if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
    delete fabric.Object.prototype.controls.mtr
  }

  // Define a custom rotation cursor
  const rotateCursor = 'crosshair'

  // Custom rotation handler (fallback if fabric.controlsUtils is missing)
  const customRotateHandler = (eventData, transform, x, y) => {
    // Try to use Fabric's built-in handler first if available
    if (fabric.controlsUtils && fabric.controlsUtils.rotationWithSnapping) {
      return fabric.controlsUtils.rotationWithSnapping(eventData, transform, x, y);
    }
    // Fallback implementation
    const target = transform.target;
    const canvas = target.canvas;
    const center = target.getCenterPoint();
    const pointer = canvas.getPointer(eventData);
    const radians = Math.atan2(pointer.y - center.y, pointer.x - center.x);
    let degrees = (radians * 180) / Math.PI;
    
    // Adjust based on which corner we are pulling (approximate)
    // This assumes the user grabs the handle relative to center
    // Ideally we want relative rotation, but absolute is easier for fallback
    degrees += 90; // Adjust for typical coordinate system alignment

    if (eventData.shiftKey) {
      degrees = Math.round(degrees / 15) * 15;
    }
    target.angle = degrees;
    return true;
  }

  // Create a helper to generate rotation controls
  const createRotateControl = (x, y, offsetX, offsetY) => {
    return new fabric.Control({
      x, y, offsetX, offsetY,
      actionHandler: customRotateHandler,
      cursorStyle: rotateCursor,
      actionName: 'rotate',
      render: () => {}, // Invisible (Photoshop style) - just changes cursor
      cornerSize: 30, // Large hit area to ensure it catches the mouse easily
      withConnection: false
    })
  }

  // Function to apply controls to an object
  const applyCustomControls = (obj) => {
    if (!obj) return;
    
    // Ensure controls object exists
    if (!obj.controls) {
      obj.controls = fabric.Object.prototype.controls ? { ...fabric.Object.prototype.controls } : {};
    }

    // Add/Overwrite rotation controls
    // Adjusted offsets to be closer to the corner for seamless transition from resize to rotate
    obj.controls.rotate_tl = createRotateControl(-0.5, -0.5, -15, -15);
    obj.controls.rotate_tr = createRotateControl(0.5, -0.5, 15, -15);
    obj.controls.rotate_bl = createRotateControl(-0.5, 0.5, -15, 15);
    obj.controls.rotate_br = createRotateControl(0.5, 0.5, 15, 15);
    
    // Hide default mtr
    delete obj.controls.mtr;
    
    obj.setCoords();
  };

  // Apply to prototype as well for new objects
  if (fabric.Object.prototype.controls) {
     fabric.Object.prototype.controls.rotate_tl = createRotateControl(-0.5, -0.5, -15, -15);
     fabric.Object.prototype.controls.rotate_tr = createRotateControl(0.5, -0.5, 15, -15);
     fabric.Object.prototype.controls.rotate_bl = createRotateControl(-0.5, 0.5, -15, 15);
     fabric.Object.prototype.controls.rotate_br = createRotateControl(0.5, 0.5, 15, 15);
     delete fabric.Object.prototype.controls.mtr;
  }

  canvas.on('object:added', (e) => {
    if (e.target) {
      applyCustomControls(e.target);
    }
  })

  // Re-apply on selection just in case
  canvas.on('selection:created', (e) => {
    if (e.selected) {
      e.selected.forEach(applyCustomControls);
    }
  })

  // Helper to hide rotation on an object
  const hideRotation = (obj) => {
    obj.setControlVisible('mtr', false)
    obj.set('hasRotatingPoint', false)
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
        hasRotatingPoint: false
      })
      // Reliably hide the rotation control
      e.target.setControlVisible('mtr', false)
    }
  })

  window.addEventListener('resize', resizeCanvas)

  // Listen for selection events
  canvas.on('selection:created', () => emit('selection-change', canvas.getActiveObject()))
  canvas.on('selection:updated', () => emit('selection-change', canvas.getActiveObject()))
  canvas.on('selection:cleared', () => emit('selection-change', null))

  // --- Advanced Smart Alignment Guides (Canvas Center + Object-to-Object) ---
  const guidelineOffset = 5 // Snapping threshold
  const guidelines = []

  const clearGuidelines = () => {
    guidelines.forEach(line => canvas.remove(line))
    guidelines.length = 0
  }

  const drawGuide = (x1, y1, x2, y2) => {
    const line = new fabric.Line([x1, y1, x2, y2], {
      stroke: '#ff0077',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      strokeDashArray: [4, 4],
      opacity: 0.8,
      originX: 'center',
      originY: 'center',
      excludeFromExport: true
    })
    canvas.add(line)
    guidelines.push(line)
  }

  canvas.on('object:moving', (e) => {
    const activeObj = e.target
    if (!activeObj) return

    clearGuidelines()
    
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // Get active object dimensions and coordinates
    // Note: getBoundingRect() returns coordinates relative to canvas (taking zoom into account if viewportTransform is standard, but usually it's better to work with aCoords for rotated objects. For simplicity, we assume non-rotated snapping or use center/size)
    // Actually, getBoundingRect(true) gives absolute coordinates.
    const activeRect = activeObj.getBoundingRect(true) 
    const activeCenterX = activeRect.left + activeRect.width / 2
    const activeCenterY = activeRect.top + activeRect.height / 2
    
    // Potential snap positions
    let snapX = null
    let snapY = null
    
    // 1. Snap to Canvas Center
    if (Math.abs(activeCenterX - canvasWidth / 2) < guidelineOffset) {
      snapX = canvasWidth / 2
      drawGuide(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight)
    }
    if (Math.abs(activeCenterY - canvasHeight / 2) < guidelineOffset) {
      snapY = canvasHeight / 2
      drawGuide(0, canvasHeight / 2, canvasWidth, canvasHeight / 2)
    }

    // 2. Snap to Other Objects
    const objects = canvas.getObjects()
    
    // Helper to check horizontal snap (Vertical lines)
    // pos: value to check, guidePos: value to snap to, startY/endY: line drawing extent
    const checkVerticalSnap = (pos, guidePos, startY, endY) => {
      if (Math.abs(pos - guidePos) < guidelineOffset) {
        snapX = snapX === null ? guidePos : snapX // Prefer canvas center if conflict, or first match
        // Adjust the line length to cover both objects
        const minY = Math.min(activeRect.top, startY)
        const maxY = Math.max(activeRect.top + activeRect.height, endY)
        drawGuide(guidePos, minY, guidePos, maxY)
        return true
      }
      return false
    }

    // Helper to check vertical snap (Horizontal lines)
    const checkHorizontalSnap = (pos, guidePos, startX, endX) => {
      if (Math.abs(pos - guidePos) < guidelineOffset) {
        snapY = snapY === null ? guidePos : snapY
        const minX = Math.min(activeRect.left, startX)
        const maxX = Math.max(activeRect.left + activeRect.width, endX)
        drawGuide(minX, guidePos, maxX, guidePos)
        return true
      }
      return false
    }

    objects.forEach(obj => {
      if (obj === activeObj || obj.excludeFromExport) return // Skip self and guides

      const rect = obj.getBoundingRect(true)
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // --- Vertical Lines (Align X) ---
      // Active Left vs Obj Left/Right/Center
      if (!snapX) {
        checkVerticalSnap(activeRect.left, rect.left, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeRect.left, rect.left + rect.width, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeRect.left, centerX, rect.top, rect.top + rect.height)
      }
      // Active Right vs Obj Left/Right/Center
      if (!snapX) {
        checkVerticalSnap(activeRect.left + activeRect.width, rect.left, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeRect.left + activeRect.width, rect.left + rect.width, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeRect.left + activeRect.width, centerX, rect.top, rect.top + rect.height)
      }
      // Active Center vs Obj Left/Right/Center
      if (!snapX) {
        checkVerticalSnap(activeCenterX, rect.left, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeCenterX, rect.left + rect.width, rect.top, rect.top + rect.height) ||
        checkVerticalSnap(activeCenterX, centerX, rect.top, rect.top + rect.height)
      }

      // --- Horizontal Lines (Align Y) ---
      // Active Top vs Obj Top/Bottom/Center
      if (!snapY) {
        checkHorizontalSnap(activeRect.top, rect.top, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeRect.top, rect.top + rect.height, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeRect.top, centerY, rect.left, rect.left + rect.width)
      }
      // Active Bottom vs Obj Top/Bottom/Center
      if (!snapY) {
        checkHorizontalSnap(activeRect.top + activeRect.height, rect.top, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeRect.top + activeRect.height, rect.top + rect.height, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeRect.top + activeRect.height, centerY, rect.left, rect.left + rect.width)
      }
      // Active Center vs Obj Top/Bottom/Center
      if (!snapY) {
        checkHorizontalSnap(activeCenterY, rect.top, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeCenterY, rect.top + rect.height, rect.left, rect.left + rect.width) ||
        checkHorizontalSnap(activeCenterY, centerY, rect.left, rect.left + rect.width)
      }
    })

    // Apply Snap
    // Logic: calculate delta needed to move activeObj to snap position
    if (snapX !== null) {
      // Find which part of activeObj matched snapX to shift correctly
      // But simplifying: check which active edge matches snapX
      let destLeft = activeRect.left
      if (Math.abs(activeRect.left - snapX) < guidelineOffset) destLeft = snapX
      else if (Math.abs((activeRect.left + activeRect.width) - snapX) < guidelineOffset) destLeft = snapX - activeRect.width
      else if (Math.abs(activeCenterX - snapX) < guidelineOffset) destLeft = snapX - activeRect.width / 2
      
      activeObj.set({ left: destLeft + (activeObj.left - activeRect.left) }) // Adjust taking transform/origin into account
      // More precise: activeObj.setPositionByOrigin(..., ...) but need to know which origin
      // Simplest robust way: activeObj.left += (snapX - matchedValue)
    }

    if (snapY !== null) {
      let destTop = activeRect.top
      if (Math.abs(activeRect.top - snapY) < guidelineOffset) destTop = snapY
      else if (Math.abs((activeRect.top + activeRect.height) - snapY) < guidelineOffset) destTop = snapY - activeRect.height
      else if (Math.abs(activeCenterY - snapY) < guidelineOffset) destTop = snapY - activeRect.height / 2
      
      activeObj.set({ top: destTop + (activeObj.top - activeRect.top) })
    }
  })

  canvas.on('mouse:up', () => {
    clearGuidelines()
    canvas.renderAll()
  })
  // -----------------------------------------------------------------------

  // --- Auto-Save (Content Change) Listener ---
  const handleModification = debounce(() => {
    console.log('Canvas modified, emitting content-change...')
    const state = getCanvasState()
    if (state) {
      emit('content-change', state)
    }
  }, 2000)

  canvas.on('object:modified', handleModification)
  canvas.on('object:added', handleModification)
  canvas.on('object:removed', handleModification)
  // -------------------------------------------

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

  // Drag and Drop Support
  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (f) => {
             // Pass Data URL to addImage, which will handle cloud upload
             addImage(f.target.result, file.name)
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }
  
  if (wrapper.value) {
      wrapper.value.addEventListener('drop', handleDrop)
      wrapper.value.addEventListener('dragover', (e) => e.preventDefault())
  }

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
    let finalUrl = url
    
    // Auto-upload to Cloud if it's a local Data URI or Blob URL
    if (typeof url === 'string' && (url.startsWith('data:') || url.startsWith('blob:'))) {
        try {
            // Convert to Blob
            const res = await fetch(url)
            const blob = await res.blob()
            const ext = blob.type.split('/')[1] || 'png'
            const filename = `img_${Date.now()}.${ext}`
            
            // Upload to LeanCloud
            finalUrl = await uploadFile(filename, blob)
            console.log('Image uploaded to cloud:', finalUrl)
        } catch (err) {
            console.error('Failed to upload image to cloud, using local URL:', err)
        }
    }

    const isDataUrl = finalUrl.startsWith('data:')
    const img = await fabric.FabricImage.fromURL(finalUrl, { crossOrigin: isDataUrl ? null : 'anonymous' })
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

const rotateSelectedObject = (angle = 90) => {
  if (!canvas) return
  const activeObj = canvas.getActiveObject()
  if (activeObj) {
    const currentAngle = activeObj.angle || 0
    activeObj.rotate((currentAngle + angle) % 360)
    canvas.requestRenderAll()
    emit('selection-change', activeObj)
  }
}

const startRotatingObject = (e) => {
  if (!canvas) return
  const activeObj = canvas.getActiveObject()
  if (!activeObj) return

  // 获取物体中心点在屏幕上的坐标
  const center = activeObj.getCenterPoint()
  const zoom = canvas.getZoom()
  const vpt = canvas.viewportTransform
  const screenCenter = {
    x: center.x * zoom + vpt[4],
    y: center.y * zoom + vpt[5]
  }

  // 计算初始角度
  const startAngle = activeObj.angle || 0
  const startMouseAngle = Math.atan2(e.clientY - screenCenter.y, e.clientX - screenCenter.x)

  const onMouseMove = (moveEvent) => {
    const currentMouseAngle = Math.atan2(moveEvent.clientY - screenCenter.y, moveEvent.clientX - screenCenter.x)
    const deltaAngle = (currentMouseAngle - startMouseAngle) * (180 / Math.PI)
    
    // 按住 Shift 键时进行 15 度吸附
    let newAngle = (startAngle + deltaAngle) % 360
    if (moveEvent.shiftKey) {
      newAngle = Math.round(newAngle / 15) * 15
    }
    
    activeObj.rotate(newAngle)
    canvas.requestRenderAll()
    emit('selection-change', activeObj)
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    emit('interaction-end')
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  emit('interaction-start')
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

const clearCanvas = () => {
  if (canvas) {
    canvas.clear()
    // Fabric.js v6+: use property assignment
    canvas.backgroundColor = 'transparent'
    canvas.renderAll()
    imageCounter = 1
    lastPlacedRect = null
    emit('selection-change', null)
  }
}

defineExpose({
  addToolElement, generatePoster: () => {}, updateSelectedObject, addImage, exportCanvas,
  getCanvasInstance, getCanvasState, loadFromJSON, deleteSelectedObject, locateObject, updateObject, removeObject, rotateSelectedObject, startRotatingObject, clearCanvas
})
</script>

<style scoped>
.canvas-container-wrapper { width: 100%; height: 100%; overflow: hidden; }
</style>
