<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { NavigationTab } from '../../types/crypto.types';

export default defineComponent({
  name: 'AppNavbar',
  props: {
    currentTab: {
      type: String as () => NavigationTab,
      required: true
    }
  },
  emits: ['update:tab'],
  setup(_, { emit }) {
    const isMobileMenuOpen = ref(false);

    const setTab = (tab: NavigationTab) => {
      emit('update:tab', tab);
      isMobileMenuOpen.value = false;
    };

    return {
      isMobileMenuOpen,
      setTab
    };
  }
});
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <!-- Logo / Brand -->
      <div class="brand" @click="setTab('main')">
        <div class="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span class="brand-name">Vault <span class="accent">Encrypter</span></span>
      </div>

      <!-- Navigation Tabs (Desktop) -->
      <div class="nav-links">
        <button
          class="nav-btn"
          :class="{ active: currentTab === 'main' }"
          @click="setTab('main')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Inicio</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: currentTab === 'encrypt' }"
          @click="setTab('encrypt')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Encriptar</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: currentTab === 'decrypt' }"
          @click="setTab('decrypt')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
          <span>Desencriptar</span>
        </button>
      </div>

      <!-- Mobile Hamburger Button -->
      <button class="mobile-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <svg v-if="!isMobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div v-if="isMobileMenuOpen" class="mobile-menu">
      <button
        class="mobile-nav-btn"
        :class="{ active: currentTab === 'main' }"
        @click="setTab('main')"
      >
        Inicio
      </button>
      <button
        class="mobile-nav-btn"
        :class="{ active: currentTab === 'encrypt' }"
        @click="setTab('encrypt')"
      >
        Encriptar Archivos
      </button>
      <button
        class="mobile-nav-btn"
        :class="{ active: currentTab === 'decrypt' }"
        @click="setTab('decrypt')"
      >
        Desencriptar Archivos
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(10, 15, 30, 0.8);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.brand-icon {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.02em;
}

.brand-name .accent {
  background: linear-gradient(135deg, #60a5fa, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.35rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.2rem;
  border-radius: 9999px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  color: #f1f5f9;
}

.nav-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.35);
}

.mobile-toggle {
  display: none;
  background: transparent;
  border: none;
  color: #f1f5f9;
  cursor: pointer;
  padding: 0.4rem;
}

.mobile-menu {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  gap: 0.5rem;
}

.mobile-nav-btn {
  padding: 0.75rem 1rem;
  text-align: left;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}

.mobile-nav-btn.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .mobile-toggle {
    display: block;
  }
}
</style>
