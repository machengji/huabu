<template>
  <div class="project-manager-modal" @click.self="$emit('close')">
    <div class="modal-content glass-panel">
      <div class="modal-header">
        <div class="header-title">
          <FolderOpen :size="24" />
          <h2>我的项目</h2>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <X :size="24" />
        </button>
      </div>

      <div class="modal-body">
        <div class="projects-actions">
           <button class="primary-btn" @click="handleSaveProject">
            <Plus :size="18" />
            保存当前项目
          </button>
          
           <!-- Bmob Settings Trigger -->
           <button class="text-btn" @click="showSettings = !showSettings">
            <Settings :size="16" />
            {{ showSettings ? '隐藏配置' : '配置云端存储' }}
           </button>
        </div>

         <!-- Settings Section -->
        <div v-if="showSettings" class="settings-section">
          <div class="setting-group">
            <label>Bmob Application ID</label>
            <input type="password" v-model="bmobAppId" placeholder="App ID">
          </div>
          <div class="setting-group">
            <label>Bmob REST API Key</label>
            <input type="password" v-model="bmobRestKey" placeholder="REST API Key">
          </div>
          <div class="setting-group">
             <label>Bmob Safe Token (可选)</label>
             <input type="password" v-model="bmobSafeToken" placeholder="Safe Token">
          </div>
        </div>

        <div class="projects-grid">
          <div v-for="project in projects" :key="project.objectId" class="project-card">
            <div class="project-thumb" @click="handleLoadProject(project)">
              <img :src="formatThumbnail(project.thumbnail)" alt="thumbnail">
              <div class="project-overlay">
                <Play :size="32" />
              </div>
            </div>
            <div class="project-info">
              <span class="project-name">{{ project.name }}</span>
              <div class="project-meta">
                 <span class="project-date">{{ formatDate(project.updatedAt || project.createdAt) }}</span>
                 <button class="delete-btn" @click.stop="handleDeleteProject(project.objectId)">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
           <div class="project-card new-project" @click="handleNewProject">
              <div class="new-project-content">
                  <FilePlus :size="32" />
                  <span>新建空白项目</span>
              </div>
           </div>
        </div>
        
        <div v-if="projects.length === 0" class="empty-state">
          <FolderOpen :size="48" />
          <p>暂无保存的项目</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { FolderOpen, Plus, Play, Trash2, X, Settings, FilePlus } from 'lucide-vue-next'
import { initBmob, loadFullProject } from '../services/bmob'
import { getLocalProjects, saveLocalProject, deleteLocalProject } from '../services/localProjects'

const emit = defineEmits(['close', 'load-project', 'get-canvas-state', 'new-project'])

const projects = ref([])
const showSettings = ref(false)
const bmobAppId = ref('')
const bmobRestKey = ref('')
const bmobSafeToken = ref('')

onMounted(() => {
  bmobAppId.value = localStorage.getItem('bmob_app_id') || ''
  bmobRestKey.value = localStorage.getItem('bmob_rest_key') || ''
  bmobSafeToken.value = localStorage.getItem('bmob_safe_token') || ''
  
  loadProjectsList()
})

watch(bmobAppId, (val) => {
  localStorage.setItem('bmob_app_id', val)
  if (val && bmobRestKey.value) initBmob(val, bmobRestKey.value, bmobSafeToken.value)
})
watch(bmobRestKey, (val) => {
  localStorage.setItem('bmob_rest_key', val)
  if (bmobAppId.value && val) initBmob(bmobAppId.value, val, bmobSafeToken.value)
})
watch(bmobSafeToken, (val) => localStorage.setItem('bmob_safe_token', val))

const loadProjectsList = () => {
  projects.value = getLocalProjects()
}

const formatThumbnail = (url) => {
  if (!url) return '' // Return default placeholder if needed
  if (typeof url === 'string' && url.includes('b0.upaiyun.com')) {
    return url.replace(/https?:\/\/[^\/]+/, '/api/bmob-cdn')
  }
  return url
}

const formatDate = (dateStr) => {
    if(!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
}

const handleSaveProject = () => {
  const name = window.prompt('请输入项目名称', `未命名项目 ${new Date().toLocaleDateString()}`)
  if (!name) return

  emit('get-canvas-state', (state) => {
    try {
      saveLocalProject(name, state.json, state.thumbnail)
      loadProjectsList()
      alert('已保存到本地！')
    } catch (error) {
      alert('保存失败: ' + error.message)
    }
  })
}

const handleLoadProject = async (project) => {
  try {
    let json
    if (project.isLocal) {
      json = typeof project.canvasData === 'string' ? JSON.parse(project.canvasData) : project.canvasData
    } else {
      json = await loadFullProject(project)
    }
    
    emit('load-project', json)
    emit('close')
  } catch (error) {
    alert('加载失败: ' + error.message)
  }
}

const handleDeleteProject = (id) => {
  if (!confirm('确定要删除这个项目吗？')) return
  deleteLocalProject(id)
  loadProjectsList()
}

const handleNewProject = () => {
    if(confirm('确定要新建项目吗？当前未保存的内容将丢失。')) {
        emit('new-project')
        emit('close')
    }
}
</script>

<style scoped>
.project-manager-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 800px;
  max-width: 90vw;
  height: 600px;
  max-height: 90vh;
  background: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.2);
}

.dark .modal-content {
  background: #1e293b;
  color: white;
}

.modal-header {
  padding: 20px 30px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #3b82f6;
}

.header-title h2 {
    font-size: 1.5rem;
    font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0,0,0,0.05);
  color: #ef4444;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.projects-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.primary-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.primary-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.text-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
}

.text-btn:hover {
    color: #3b82f6;
}

.settings-section {
    background: #f8fafc;
    padding: 20px;
    border-radius: 12px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.dark .settings-section {
    background: rgba(255,255,255,0.05);
}

.setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.setting-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
}

.setting-group input {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0,0.1);
    background: white;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.project-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  group: true;
}

.project-thumb {
  position: relative;
  aspect-ratio: 16/10;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.project-card:hover .project-thumb {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
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
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  backdrop-filter: blur(2px);
}

.project-thumb:hover .project-overlay {
  opacity: 1;
}

.project-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.project-name {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .project-name {
    color: #f1f5f9;
}

.project-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #94a3b8;
}

.delete-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.new-project {
    cursor: pointer;
}

.new-project-content {
    height: 100%;
    aspect-ratio: 16/10;
    border: 2px dashed rgba(0,0,0,0.1);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
    transition: all 0.2s;
}

.new-project:hover .new-project-content {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #cbd5e1;
    gap: 16px;
}
</style>
