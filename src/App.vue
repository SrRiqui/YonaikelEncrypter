<script setup lang="ts">
import { ref } from 'vue';
import type { NavigationTab } from './types/crypto.types';
import ParticleCanvas from './components/common/ParticleCanvas.vue';
import AppNavbar from './components/common/AppNavbar.vue';
import MainHubView from './views/MainHubView.vue';
import FileEncrypter from './components/crypto/FileEncrypter.vue';
import FileDecryptor from './components/crypto/FileDecryptor.vue';

const activeTab = ref<NavigationTab>('main');

const handleNavigation = (tab: NavigationTab) => {
  activeTab.value = tab;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<template>
  <div class="app-wrapper">
    <!-- WebGL Particle Interactive Canvas Background -->
    <ParticleCanvas />

    <!-- Top Navigation Bar -->
    <AppNavbar :current-tab="activeTab" @update:tab="handleNavigation" />

    <!-- Main Content Area with Animated Page Transition -->
    <main class="content-container">
      <Transition name="view-fade" mode="out-in">
        <div v-if="activeTab === 'main'" key="main" class="view-wrapper">
          <MainHubView @navigate="handleNavigation" />
        </div>

        <div v-else-if="activeTab === 'encrypt'" key="encrypt" class="view-wrapper">
          <FileEncrypter @go-home="handleNavigation('main')" />
        </div>

        <div v-else-if="activeTab === 'decrypt'" key="decrypt" class="view-wrapper">
          <FileDecryptor @go-home="handleNavigation('main')" />
        </div>
      </Transition>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <p>Vault Encrypter &bull; Sistema de Encriptación y Desencriptación Web &bull; Tecnologías AES-GCM, Base64 & Custom Layer</p>
    </footer>
  </div>
</template>

<style scoped>
.app-wrapper {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-container {
  flex: 1;
  position: relative;
  z-index: 10;
}

.view-wrapper {
  width: 100%;
}

.app-footer {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 15, 30, 0.85);
  backdrop-filter: blur(12px);
  color: #64748b;
  font-size: 0.85rem;
}

/* Transitions */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
