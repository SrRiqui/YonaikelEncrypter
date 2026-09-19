<script lang="ts">
import { defineComponent } from 'vue';
import type { NavigationTab } from '../../types/crypto.types';

export default defineComponent({
  name: 'ScrambleTitle',
  emits: ['navigate'],
  data() {
    return {
      originalText: 'Yonaikel Encrypter',
      displayText: 'Yonaikel Encrypter',
      isEncrypting: false,
      intervalId: 0 as any,
      scrambleIntervalId: 0 as any,
      timeouts: [] as any[],
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
    clearInterval(this.scrambleIntervalId);
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  },
  methods: {
    startAnimation() {
      this.intervalId = setInterval(() => {
        this.isEncrypting = true;
        const t1 = setTimeout(() => {
          this.scrambleText();
          this.scrambleIntervalId = setInterval(() => {
            this.scrambleText();
          }, 80);
        }, 300);

        const t2 = setTimeout(() => {
          clearInterval(this.scrambleIntervalId);
          this.displayText = this.originalText;
          this.isEncrypting = false;
        }, 1800);

        this.timeouts.push(t1, t2);
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
  padding: 3.5rem 1.5rem 2.5rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.35rem 0.95rem;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 500;
  margin-bottom: 1.75rem;
  backdrop-filter: blur(10px);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
  animation: pulse 2.2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
}

.scramble-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 1.25rem 0;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.6);
}

.char {
  display: inline-block;
  transition: color 0.15s ease, transform 0.15s ease;
}

.char.encrypted {
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
  transform: translateY(-1px);
}

.hero-description {
  max-width: 600px;
  color: #94a3b8;
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0 0 2.25rem 0;
}

.hero-actions {
  display: flex;
  gap: 0.85rem;
  margin-bottom: 3.5rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.8rem 1.6rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action.primary {
  background: #171e2c;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.btn-action.primary:hover {
  background: #202a3d;
  border-color: rgba(255, 255, 255, 0.26);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.btn-action.secondary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  backdrop-filter: blur(8px);
}

.btn-action.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transform: translateY(-2px);
}

.info-content {
  max-width: 1100px;
  width: 100%;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.feature-card {
  background: rgba(12, 16, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  padding: 1.5rem 1.4rem;
  text-align: left;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(17, 23, 36, 0.85);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.card-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  margin-bottom: 0.85rem;
  letter-spacing: 0.04em;
}

.feature-card h3 {
  color: #f1f5f9;
  font-size: 1.1rem;
  margin: 0 0 0.45rem 0;
  font-weight: 600;
}

.feature-card p {
  color: #8392a5;
  font-size: 0.88rem;
  line-height: 1.55;
  margin: 0;
}

@media (max-width: 768px) {
  .scramble-title {
    font-size: 2.3rem;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }
}
</style>
