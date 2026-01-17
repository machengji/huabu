<template>
  <div class="login-modal-overlay">
    <div class="login-modal glass-panel">
      <div class="modal-header">
        <h2>{{ isRegister ? '注册账号' : '登录 Poster Studio' }}</h2>
        <p>{{ isRegister ? '创建您的专属设计空间' : '欢迎回来，继续您的创作' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="input-group">
          <label>用户名</label>
          <input type="text" v-model="username" required placeholder="请输入用户名">
        </div>
        
        <div class="input-group">
          <label>密码</label>
          <input type="password" v-model="password" required placeholder="请输入密码">
        </div>

        <div v-if="isRegister" class="input-group">
          <label>邮箱 (可选)</label>
          <input type="email" v-model="email" placeholder="用于找回密码">
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '处理中...' : (isRegister ? '注册' : '登录') }}
        </button>
      </form>

      <div class="modal-footer">
        <span v-if="isRegister">已有账号？ <a href="#" @click.prevent="isRegister = false">去登录</a></span>
        <span v-else>还没有账号？ <a href="#" @click.prevent="isRegister = true">去注册</a></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { logIn, signUp } from '../services/leancloud'

const emit = defineEmits(['success'])

const isRegister = ref(false)
const username = ref('')
const password = ref('')
const email = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleSubmit = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    if (isRegister.value) {
      await signUp(username.value, password.value, email.value)
    } else {
      await logIn(username.value, password.value)
    }
    emit('success')
  } catch (error) {
    errorMsg.value = error.message || '操作失败，请检查用户名或密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.login-modal {
  width: 400px;
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.dark .login-modal {
  background: #1e293b;
  color: white;
}

.modal-header {
  text-align: center;
  margin-bottom: 30px;
}

.modal-header h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  color: #3b82f6;
}

.modal-header p {
  color: #64748b;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.dark .input-group label {
  color: #cbd5e1;
}

.input-group input {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1);
  background: #f8fafc;
  font-size: 1rem;
}

.error-msg {
  color: #ef4444;
  font-size: 0.85rem;
  text-align: center;
}

.submit-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 10px;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.modal-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 0.9rem;
  color: #64748b;
}

.modal-footer a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
}
</style>
