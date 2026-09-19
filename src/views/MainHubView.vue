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
  font-size: 1.5rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 2rem;
  letter-spacing: -0.02em;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.75rem;
}

.action-card {
  position: relative;
  background: rgba(12, 16, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 2.25rem 2rem;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(16, 22, 34, 0.85);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 65%);
}

.action-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  color: #f8fafc;
  background: #171e2c;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s ease;
}

.action-card:hover .card-icon-wrapper {
  border-color: rgba(255, 255, 255, 0.25);
}

.card-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.green-tag {
  color: #94a3b8;
}

.card-heading {
  font-size: 1.35rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.65rem 0;
  letter-spacing: -0.01em;
}

.card-description {
  color: #8392a5;
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0 0 2rem 0;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: #cbd5e1;
  transition: gap 0.2s ease, color 0.2s ease;
}

.card-footer .green-text {
  color: #cbd5e1;
}

.action-card:hover .card-footer {
  color: #ffffff;
  gap: 0.75rem;
}
</style>
