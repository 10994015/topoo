<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'


// 使用 router 和認證 store
const router = useRouter()
const authStore = useAuthStore()


onMounted(() => {
  
})
</script>

<template>
  <main>
      首頁
  </main>
</template>
