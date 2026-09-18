<script lang="ts">
import { defineComponent } from 'vue';
import type { NavigationTab } from '../../types/crypto.types';

export default defineComponent({
  name: 'ScrambleTitle',
  emits: ['navigate'],
  data() {
    return {
      originalText: 'Vault Encrypter',
      displayText: 'Vault Encrypter',
      isEncrypting: false,
      intervalId: 0 as any,
      features: [
        {
          id: 'encrypt',
          title: 'Encriptación Rápida',
          description: 'Cifra documentos, textos e imágenes con algoritmos avanzados.',
          badge: 'Módulo Activo'
        },
        {
          id: 'decrypt',
          title: 'Desencriptación Segura',
          description: 'Restaura y descarga tus archivos en su estado y formato original.',
          badge: 'Módulo Activo'
        },
        {
          id: 'aes',
          title: 'Seguridad AES-GCM',
          description: 'Criptografía militar con claves de 256 bits y verificación de integridad.',
          badge: 'FIPS Cert'
        },
        {
          id: 'custom',
          title: 'Algoritmo Multi-Capa',
          description: 'Cifrado exclusivo por capas con XOR dinámico y rotación simétrica.',
          badge: 'Custom Cipher'
        }
      ]
    };
  },
  mounted() {
    this.startAnimation();
  },
  beforeUnmount() {
    clearInterval(this.intervalId);
  },
  methods: {
    startAnimation() {
      this.intervalId = setInterval(() => {
        this.isEncrypting = true;
        setTimeout(() => {
          this.scrambleText();
        }, 300);

        setTimeout(() => {
          this.displayText = this.originalText;
          this.isEncrypting = false;
        }, 1800);
      }, 5000);
    },
    scrambleText() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>[]{}';
      this.displayText = this.originalText
        .split('')
        .map(char => (char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]))
        .join('');
    },
    emitNavigation(tab: NavigationTab) {
      this.$emit('navigate', tab);
    }
  }
});
</script>

<template>
  <div class="scramble-container">
    <div class="badge-pill">
      <span class="pulse-dot"></span>
      Sistema de Criptografía de Nueva Generación
    </div>

    <h1 class="scramble-title">
      <span
        v-for="(char, index) in displayText"
        :key="index"
        :style="{ '--delay': `${index * 0.05}s` }"
        class="char"
        :class="{ encrypted: isEncrypting }"
      >
        {{ char }}
      </span>
    </h1>

    <p class="hero-description">
      Protege y recupera tus archivos confidenciales con tecnologías criptográficas de alto nivel directamente en tu navegador.
    </p>

    <!-- Quick action buttons -->
    <div class="hero-actions">
      <button class="btn-action primary" @click="emitNavigation('encrypt')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Ir a Encriptar</span>
      </button>

      <button class="btn-action secondary" @click="emitNavigation('decrypt')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
        <span>Ir a Desencriptar</span>
      </button>
    </div>

    <!-- Feature Cards -->
    <div class="info-content">
      <div class="features">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
          :style="{ '--delay': `${index * 0.15}s` }"
        >
          <span class="card-badge">{{ feature.badge }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scramble-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1.75rem;
  backdrop-filter: blur(8px);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 10px #3b82f6;
  animation: pulse 1.8s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 1; }
}

.scramble-title {
  font-size: 3.75rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 1.25rem 0;
  letter-spacing: -0.03em;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.8);
}

.char {
  display: inline-block;
  transition: all 0.25s ease;
}

.char.encrypted {
  color: #60a5fa;
  text-shadow: 0 0 15px #3b82f6, 0 0 30px #60a5fa;
  transform: translateY(-2px);
}

.hero-description {
  max-width: 620px;
  color: #94a3b8;
  font-size: 1.15rem;
  line-height: 1.6;
  margin: 0 0 2.25rem 0;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3.5rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.75rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-action.primary {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: white;
  border: none;
  box-shadow: 0 6px 25px rgba(37, 99, 235, 0.4);
}

.btn-action.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.55);
}

.btn-action.secondary {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
  backdrop-filter: blur(8px);
}

.btn-action.secondary:hover {
  background: rgba(16, 185, 129, 0.25);
  transform: translateY(-2px);
}

.info-content {
  max-width: 1100px;
  width: 100%;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  text-align: left;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(30, 41, 59, 0.75);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.card-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #60a5fa;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.feature-card h3 {
  color: #f1f5f9;
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.feature-card p {
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 768px) {
  .scramble-title {
    font-size: 2.5rem;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
}
</style>
