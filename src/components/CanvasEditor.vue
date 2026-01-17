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

defineExpose({
  addToolElement, generatePoster: () => {}, updateSelectedObject, addImage, exportCanvas,
  getCanvasInstance, getCanvasState, loadFromJSON, deleteSelectedObject, locateObject, updateObject, removeObject, rotateSelectedObject, startRotatingObject
})
</script>

<style scoped>
.canvas-container-wrapper { width: 100%; height: 100%; overflow: hidden; }
</style>
