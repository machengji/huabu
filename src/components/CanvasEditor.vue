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

  // --- 稳定版吸附逻辑 ---
  const guidelineOffset = 10
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
      excludeFromExport: true
    })
    canvas.add(line)
    guidelines.push(line)
  }

  canvas.on('object:moving', (options) => {
    const activeObj = options.target
    if (!activeObj) return

    clearGuidelines()
    
    // 禁用移动时的边框显示以减少视觉干扰
    activeObj.set({
      hasControls: false,
      hasBorders: false
    })

    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // 关键修复点 1：使用 aCoords 获取物体顶点的精确画布坐标
    // getBoundingRect 包含旋转后的整体包围盒，在吸附时会产生偏移和数学舍入误差
    activeObj.setCoords()
    const aCoords = activeObj.aCoords
    const activeRect = {
      left: Math.min(aCoords.tl.x, aCoords.tr.x, aCoords.bl.x, aCoords.br.x),
      top: Math.min(aCoords.tl.y, aCoords.tr.y, aCoords.bl.y, aCoords.br.y),
      width: Math.max(aCoords.tl.x, aCoords.tr.x, aCoords.bl.x, aCoords.br.x) - Math.min(aCoords.tl.x, aCoords.tr.x, aCoords.bl.x, aCoords.br.x),
      height: Math.max(aCoords.tl.y, aCoords.tr.y, aCoords.bl.y, aCoords.br.y) - Math.min(aCoords.tl.y, aCoords.tr.y, aCoords.bl.y, aCoords.br.y)
    }
    const activeCenterX = activeRect.left + activeRect.width / 2
    const activeCenterY = activeRect.top + activeRect.height / 2

    // 收集所有潜在的对齐目标点
    const xTargets = [canvasWidth / 2]
    const yTargets = [canvasHeight / 2]

    canvas.getObjects().forEach(obj => {
      if (obj === activeObj || obj.excludeFromExport) return
      obj.setCoords()
      const r = obj.getBoundingRect(true)
      xTargets.push(r.left, r.left + r.width, r.left + r.width / 2)
      yTargets.push(r.top, r.top + r.height, r.top + r.height / 2)
    })

    // 寻找最近的对齐点
    let snapX = null, snapY = null
    let minDiffX = guidelineOffset, minDiffY = guidelineOffset
    let deltaX = 0, deltaY = 0

    // 检测 X 轴
    const currentXPoints = [activeRect.left, activeRect.left + activeRect.width, activeCenterX]
    xTargets.forEach(targetX => {
      currentXPoints.forEach(currentX => {
        const diff = Math.abs(targetX - currentX)
        if (diff < minDiffX) {
          minDiffX = diff
          snapX = targetX
          deltaX = targetX - currentX
        }
      })
    })

    // 检测 Y 轴
    const currentYPoints = [activeRect.top, activeRect.top + activeRect.height, activeCenterY]
    yTargets.forEach(targetY => {
      currentYPoints.forEach(currentY => {
        const diff = Math.abs(targetY - currentY)
        if (diff < minDiffY) {
          minDiffY = diff
          snapY = targetY
          deltaY = targetY - currentY
        }
      })
    })

    // 关键修复点 2：在修改位置前，先清除 Fabric 的默认变换缓存
    // 抖动往往是因为吸附逻辑修改了位置，但鼠标事件监听器下一帧又基于旧的缓存进行增量计算
    if (snapX !== null) {
      activeObj.left = Math.round(activeObj.left + deltaX) // 使用 Math.round 防止像素舍入抖动
      drawGuide(snapX, 0, snapX, canvasHeight)
    }
    if (snapY !== null) {
      activeObj.top = Math.round(activeObj.top + deltaY)
      drawGuide(0, snapY, canvasWidth, snapY)
    }

    if (snapX !== null || snapY !== null) {
      activeObj.setCoords()
      // 关键修复点 3：确保在吸附状态下，画笔和交互层完全同步
      canvas.requestRenderAll()
    }
  })

  canvas.on('mouse:up', () => {
    const activeObj = canvas.getActiveObject()
    if (activeObj) {
      activeObj.hasControls = true
      activeObj.hasBorders = true
    }
    clearGuidelines()
    canvas.renderAll()
  })

  canvas.on('mouse:up', () => {
    const activeObj = canvas.getActiveObject()
    if (activeObj) {
      activeObj.set({
        hasControls: true,
        hasBorders: true
      })
    }
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
  
  // 1. 创建占位骨架屏 (Loading Placeholder)
  const targetWidth = 200
    const placeholderHeight = 150 // 默认高度
    let posX = canvas.width / 2, posY = canvas.height / 2
    
    // 如果有最后放置的位置，则偏移放置
    if (lastPlacedRect) {
      posX = lastPlacedRect.left + 20
      posY = lastPlacedRect.top + 20
      if (posX + targetWidth / 2 > canvas.width - 50) {
        posX = canvas.width / 2
        posY = canvas.height / 2
      }
    }

    // 使用 Rect 作为骨架图
    const skeleton = new fabric.Rect({
      left: posX,
      top: posY,
      width: targetWidth,
      height: placeholderHeight,
      fill: '#f1f5f9',
      stroke: '#e2e8f0',
      strokeWidth: 1,
      rx: 8,
      ry: 8,
      originX: 'center',
      originY: 'center',
      name: '正在加载...',
      selectable: false, // 加载中不可选中
      evented: false    // 不响应事件
    })
    
    // 添加一个简单的呼吸动画效果
    const animateSkeleton = () => {
      if (!skeleton.canvas) return
      skeleton.animate({ opacity: skeleton.opacity === 0.5 ? 1 : 0.5 }, {
        duration: 800,
        onChange: () => canvas.requestRenderAll(),
        onComplete: animateSkeleton
      })
    }
    
    canvas.add(skeleton)
    canvas.requestRenderAll()
    animateSkeleton()

    try {
      console.log('Starting image upload/load for:', url.substring(0, 50) + '...')
      let finalUrl = url
      
      // Auto-upload to Cloud if it's a local Data URI or Blob URL
      if (typeof url === 'string' && (url.startsWith('data:') || url.startsWith('blob:'))) {
          try {
              const res = await fetch(url)
              const blob = await res.blob()
              const ext = blob.type.split('/')[1] || 'png'
              const filename = `img_${Date.now()}.${ext}`
              finalUrl = await uploadFile(filename, blob)
              console.log('Upload success, final URL:', finalUrl)
          } catch (err) {
              console.error('Failed to upload image to cloud, using local URL:', err)
          }
      }

      console.log('Loading image from URL:', finalUrl)
      const isDataUrl = finalUrl.startsWith('data:')
      const img = await fabric.FabricImage.fromURL(finalUrl, { 
        crossOrigin: isDataUrl ? null : 'anonymous' 
      })
      console.log('Image loaded successfully:', img.width, 'x', img.height)
      
      const scale = targetWidth / img.width
      const scaledWidth = targetWidth
      const scaledHeight = img.height * scale
      
      // 使用预设的名字
      const name = customName || `图片 ${imageCounter++}`
      
      img.set({ 
        left: skeleton.left, 
        top: skeleton.top, 
        originX: 'center', 
        originY: 'center', 
        scaleX: scale, 
        scaleY: scale, 
        name,
        opacity: 0 // 先透明，淡入显示
      })

      // 替换骨架屏
      canvas.remove(skeleton)
      canvas.add(img)
      canvas.setActiveObject(img)
      
      // 淡入动画
      img.animate({ opacity: 1 }, {
        duration: 300,
        onChange: () => canvas.requestRenderAll()
      })

      lastPlacedRect = { left: img.left, top: img.top, width: scaledWidth, height: scaledHeight }
      canvas.requestRenderAll()
    } catch (e) { 
      console.error('Failed to add image', e)
      canvas.remove(skeleton)
      canvas.requestRenderAll()
    }
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
    // 1. 创建转圈圈 (Loading Spinner)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    const spinner = new fabric.Circle({
      left: centerX,
      top: centerY,
      radius: 15,
      fill: 'transparent',
      stroke: '#3b82f6',
      strokeWidth: 3,
      strokeDashArray: [20, 40],
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      name: 'temp_spinner',
      opacity: 0.8,
      excludeFromExport: true // 确保导出时不包含它
    })
    
    // 不要调用 canvas.clear()! 
    // 直接添加 spinner 并渲染
    canvas.add(spinner)
    canvas.setActiveObject(spinner) // 可选：让它保持在顶层
    
    const animateSpinner = () => {
      if (!spinner.canvas) return
      spinner.animate({ angle: 360 }, {
        duration: 1000,
        onChange: () => canvas.requestRenderAll(),
        onComplete: () => {
          spinner.angle = 0
          animateSpinner()
        }
      })
    }
    animateSpinner()
    canvas.requestRenderAll()

    // 2. 加载数据 (Fabric 会自动清空当前画布并载入新数据)
    await canvas.loadFromJSON(json)
    
    // 3. 恢复后的处理
    const images = canvas.getObjects('image')
    if (images.length > 0) {
      const maxNum = Math.max(...images.map(img => {
        const match = img.name?.match(/图片 (\d+)/)
        return match ? parseInt(match[1]) : 0
      }))
      imageCounter = maxNum + 1
    }
    
    // 重新应用所有对象的控制点
    canvas.getObjects().forEach(applyCustomControls)
    
    canvas.renderAll()
  } catch (e) { 
    console.error('Failed to load project:', e)
    canvas.renderAll()
  }
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
