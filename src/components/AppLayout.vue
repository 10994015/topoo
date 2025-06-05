<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
 
</script>

<template>
    <div class="app">
        <AppSidebar />
        <main class="main-content">
            <AppHeader />
            <router-view></router-view>
        </main>
    </div>
</template>

<style scoped lang="scss">
.app {
  display: flex;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    }
}

</style>