<script lang="ts">
import { defineComponent } from 'vue';
import type { NavigationTab } from '../types/crypto.types';
import ScrambleTitle from '../components/common/ScrambleTitle.vue';

export default defineComponent({
  name: 'MainHubView',
  components: {
    ScrambleTitle
  },
  emits: ['navigate'],
  methods: {
    emitNavigation(tab: NavigationTab) {
      this.$emit('navigate', tab);
    }
  }
});
</script>

<template>
  <div class="main-hub">
    <!-- Animated Scramble Title & Hero -->
    <ScrambleTitle @navigate="emitNavigation" />

    <!-- Choose Section Cards -->
    <section class="selection-section">
      <h2 class="selection-title">Selecciona una Operación</h2>
      <div class="cards-grid">
        <!-- Encrypt Card -->
        <div class="action-card encrypt-card" @click="emitNavigation('encrypt')">
          <div class="card-glow encrypt-glow"></div>
          <div class="card-content">
            <div class="card-icon-wrapper encrypt-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <span class="card-tag">Operación Primaria</span>
            <h3 class="card-heading">Encriptar Archivos</h3>
            <p class="card-description">
              Sube tus documentos, fotos o textos para transformarlos en una estructura blindada. Elige entre Base64, AES militar de 256 bits o el método multi-capa exclusivo.
            </p>
            <div class="card-footer">
              <span class="btn-text">Entrar a Encriptar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </div>

        <!-- Decrypt Card -->
        <div class="action-card decrypt-card" @click="emitNavigation('decrypt')">
          <div class="card-glow decrypt-glow"></div>
          <div class="card-content">
            <div class="card-icon-wrapper decrypt-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </div>
            <span class="card-tag green-tag">Operación Inversa</span>
            <h3 class="card-heading">Desencriptar Archivos</h3>
            <p class="card-description">
              ¿Tienes un archivo previamente encriptado? Selecciónalo, elige el algoritmo correspondiente y recupéralo de inmediato en su formato descargable original.
            </p>
            <div class="card-footer">
              <span class="btn-text green-text">Entrar a Desencriptar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.main-hub {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 4rem;
}

.selection-section {
  padding: 0 1.5rem;
  margin-top: 1rem;
}

.selection-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 2rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.action-card {
  position: relative;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 2.25rem;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-card:hover {
  transform: translateY(-6px);
}

.encrypt-card:hover {
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 15px 35px rgba(37, 99, 235, 0.25);
}

.decrypt-card:hover {
  border-color: rgba(16, 185, 129, 0.6);
  box-shadow: 0 15px 35px rgba(16, 185, 129, 0.25);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.encrypt-glow {
  background: radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 60%);
}

.decrypt-glow {
  background: radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 60%);
}

.action-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: white;
}

.encrypt-icon {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.decrypt-icon {
  background: linear-gradient(135deg, #059669, #0d9488);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.card-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #93c5fd;
  margin-bottom: 0.5rem;
}

.green-tag {
  color: #6ee7b7;
}

.card-heading {
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.75rem 0;
}

.card-description {
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 2rem 0;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #60a5fa;
  transition: gap 0.2s ease;
}

.card-footer .green-text {
  color: #34d399;
}

.action-card:hover .card-footer {
  gap: 0.85rem;
}
</style>
