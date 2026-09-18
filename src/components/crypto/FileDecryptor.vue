<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { CryptoAlgorithmId, DecryptedFileItem, MethodOption, QueuedFile } from '../../types/crypto.types';
import { CryptoEngine } from '../../services/crypto';
import { readFileAsString, triggerFileDownload } from '../../utils/file.utils';
import { formatFileSize, formatCurrentTime, cleanEncryptedFileName } from '../../utils/format.utils';

export default defineComponent({
  name: 'FileDecryptor',
  emits: ['go-home'],
  setup() {
    const fileInput = ref<HTMLInputElement | null>(null);
    const selectedAlgorithm = ref<CryptoAlgorithmId>('aes');
    const decryptQueue = ref<QueuedFile[]>([]);
    const decryptedFiles = ref<DecryptedFileItem[]>([]);
    const isProcessing = ref<boolean>(false);
    const errorMessage = ref<string>('');
    const isDragging = ref<boolean>(false);

    const methods: MethodOption[] = [
      {
        id: 'base64',
        title: 'Base64 Decoding',
        description: 'Decodificación estándar de texto Base64',
        tag: 'Fast'
      },
      {
        id: 'aes',
        title: 'AES-GCM 256-bit',
        description: 'Descifrado seguro autenticado con Web Crypto API',
        tag: 'Recomendado'
      },
      {
        id: 'custom',
        title: 'Custom Multi-Layer',
        description: 'Descifrado inverso de algoritmo por capas',
        tag: 'Custom'
      }
    ];

    const selectAlgorithm = (id: CryptoAlgorithmId) => {
      selectedAlgorithm.value = id;
      errorMessage.value = '';
    };

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      addFilesToQueue(Array.from(target.files));
      if (fileInput.value) fileInput.value.value = '';
    };

    const handleFileDrop = (event: DragEvent) => {
      isDragging.value = false;
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length > 0) {
        addFilesToQueue(files);
      }
    };

    const addFilesToQueue = (files: File[]) => {
      files.forEach(file => {
        decryptQueue.value.push({
          id: Math.random().toString(36).substring(2, 11),
          file,
          algorithm: selectedAlgorithm.value,
          status: 'queued',
          progress: 0
        });
      });
      errorMessage.value = '';
    };

    const processQueue = async () => {
      if (isProcessing.value || decryptQueue.value.length === 0) return;
      isProcessing.value = true;
      errorMessage.value = '';

      for (const item of decryptQueue.value) {
        if (item.status === 'completed') continue;

        try {
          item.status = 'processing';
          item.progress = 35;

          const fileContent = await readFileAsString(item.file);
          const outputName = `decrypted_${cleanEncryptedFileName(item.file.name)}`;

          const resultFile = await CryptoEngine.decrypt(fileContent, item.algorithm, outputName);
          item.progress = 75;

          const downloadUrl = URL.createObjectURL(resultFile);

          decryptedFiles.value.unshift({
            id: item.id,
            name: resultFile.name,
            size: resultFile.size,
            algorithm: item.algorithm,
            date: formatCurrentTime(),
            downloadUrl
          });

          item.status = 'completed';
          item.progress = 100;
        } catch (err: any) {
          item.status = 'error';
          item.error = err.message || 'Error durante la desencriptación';
        }
      }

      setTimeout(() => {
        decryptQueue.value = decryptQueue.value.filter(f => f.status !== 'completed');
      }, 1500);

      isProcessing.value = false;
    };

    const downloadFile = (fileItem: DecryptedFileItem) => {
      triggerFileDownload(fileItem.downloadUrl, fileItem.name);
    };

    const deleteFile = (id: string) => {
      decryptedFiles.value = decryptedFiles.value.filter(f => f.id !== id);
    };

    return {
      fileInput,
      selectedAlgorithm,
      decryptQueue,
      decryptedFiles,
      isProcessing,
      errorMessage,
      isDragging,
      methods,
      selectAlgorithm,
      triggerFileInput,
      handleFileUpload,
      handleFileDrop,
      processQueue,
      downloadFile,
      deleteFile,
      formatFileSize
    };
  }
});
</script>

<template>
  <div class="decryptor-dashboard">
    <!-- Header with Back Button -->
    <header class="dashboard-header">
      <div class="header-left">
        <button class="btn-back" @click="$emit('go-home')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span>Inicio</span>
        </button>
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
        </div>
        <div>
          <h1 class="title">Módulo de Desencriptación</h1>
          <p class="subtitle">Descifra archivos cifrados y recupéralos en su formato original.</p>
        </div>
      </div>
    </header>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="error-banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Step 1: Select Algorithm -->
    <section class="section">
      <div class="step-badge green">Paso 1</div>
      <h2 class="section-title">Selecciona el Algoritmo Usado al Encriptar</h2>
      <div class="methods-grid">
        <div
          v-for="m in methods"
          :key="m.id"
          class="method-card"
          :class="{ selected: selectedAlgorithm === m.id }"
          @click="selectAlgorithm(m.id)"
        >
          <div class="card-header">
            <span class="tag" :class="{ 'tag-highlight': m.tag === 'Recomendado' }">{{ m.tag }}</span>
            <div class="radio-indicator"></div>
          </div>
          <h3 class="card-title">{{ m.title }}</h3>
          <p class="card-desc">{{ m.description }}</p>
        </div>
      </div>
    </section>

    <!-- Step 2: Upload Files -->
    <section class="section">
      <div class="step-badge green">Paso 2</div>
      <h2 class="section-title">Carga tu Archivo Encriptado</h2>

      <div
        class="dropzone"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleFileDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden-input"
          @change="handleFileUpload"
        />
        <div class="dropzone-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p class="drop-text">Arrastra el archivo encriptado aquí o <span class="highlight">haz clic para examinar</span></p>
          <p class="drop-sub">Algoritmo activo: <strong class="active-badge">{{ selectedAlgorithm.toUpperCase() }}</strong></p>
        </div>
      </div>

      <!-- Step 3: Queue & Decrypt Action Button -->
      <div v-if="decryptQueue.length > 0" class="queue-card">
        <div class="queue-header">
          <div>
            <div class="step-badge green inline">Paso 3</div>
            <h3 class="queue-title">Archivos listos para descifrar ({{ decryptQueue.length }})</h3>
          </div>
          <button
            class="btn-decrypt"
            :disabled="isProcessing"
            @click="processQueue"
          >
            <svg v-if="!isProcessing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            <span v-if="isProcessing">Descifrando...</span>
            <span v-else>Desencriptar Ahora</span>
          </button>
        </div>

        <div class="queue-list">
          <div v-for="item in decryptQueue" :key="item.id" class="queue-item">
            <div class="item-info">
              <span class="file-name">{{ item.file.name }}</span>
              <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <span class="status-badge" :class="item.status">{{ item.status }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Step 4: Download Result Table -->
    <section v-if="decryptedFiles.length > 0" class="section">
      <div class="step-badge success">Paso 4</div>
      <h2 class="section-title">Archivos Desencriptados Disponibles</h2>
      <div class="files-table-container">
        <table class="files-table">
          <thead>
            <tr>
              <th>Nombre del Archivo Recuperado</th>
              <th>Algoritmo</th>
              <th>Tamaño</th>
              <th>Hora</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in decryptedFiles" :key="f.id">
              <td class="font-medium file-name-cell">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                {{ f.name }}
              </td>
              <td><span class="algo-badge">{{ f.algorithm.toUpperCase() }}</span></td>
              <td>{{ formatFileSize(f.size) }}</td>
              <td class="text-muted">{{ f.date }}</td>
              <td class="actions-cell">
                <button class="btn-download" title="Descargar archivo original recuperado" @click="downloadFile(f)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Descargar Original</span>
                </button>
                <button class="btn-icon delete" title="Eliminar" @click="deleteFile(f.id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.decryptor-dashboard {
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem 1.5rem;
  color: #e2e8f0;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  background: rgba(15, 23, 42, 0.7);
  padding: 1.5rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.header-icon {
  background: linear-gradient(135deg, #059669, #0d9488);
  color: white;
  padding: 0.9rem;
  border-radius: 14px;
  display: flex;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.subtitle {
  color: #94a3b8;
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.step-badge {
  display: inline-block;
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}

.step-badge.green {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.step-badge.inline {
  margin-bottom: 0.2rem;
}

.step-badge.success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 1rem 0;
}

.methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.method-card {
  background: rgba(15, 23, 42, 0.65);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.4rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
}

.method-card:hover {
  border-color: rgba(16, 185, 129, 0.5);
  transform: translateY(-2px);
  background: rgba(30, 41, 59, 0.7);
}

.method-card.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.tag {
  background: rgba(255, 255, 255, 0.1);
  color: #6ee7b7;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
}

.tag-highlight {
  background: rgba(16, 185, 129, 0.25);
  color: #a7f3d0;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #64748b;
}

.method-card.selected .radio-indicator {
  border-color: #10b981;
  background: #10b981;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
}

.card-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

.dropzone {
  border: 2px dashed rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  padding: 3rem 2rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.25s ease;
}

.dropzone:hover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.dropzone.dragging {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.hidden-input {
  display: none;
}

.dropzone-content svg {
  color: #34d399;
  margin-bottom: 1rem;
}

.drop-text {
  font-size: 1.1rem;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
}

.highlight {
  color: #34d399;
  font-weight: 600;
  text-decoration: underline;
}

.drop-sub {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

.active-badge {
  color: #34d399;
}

.queue-card {
  margin-top: 1.5rem;
  background: rgba(15, 23, 42, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  backdrop-filter: blur(12px);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.queue-title {
  margin: 0;
  font-size: 1.1rem;
  color: #f1f5f9;
}

.btn-decrypt {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #059669, #0d9488);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
  transition: all 0.2s;
}

.btn-decrypt:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
}

.btn-decrypt:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-item {
  background: rgba(30, 41, 59, 0.6);
  padding: 0.85rem 1.25rem;
  border-radius: 12px;
  display: grid;
  grid-template-columns: 1fr 140px 90px;
  align-items: center;
  gap: 1rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-name {
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.status-badge {
  font-size: 0.75rem;
  text-transform: capitalize;
  text-align: center;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.status-badge.completed { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.status-badge.processing { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.status-badge.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

.files-table-container {
  background: rgba(15, 23, 42, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.files-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.files-table th {
  background: rgba(30, 41, 59, 0.5);
  padding: 1rem 1.25rem;
  color: #94a3b8;
  font-weight: 600;
}

.files-table td {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #f1f5f9;
}

.algo-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download:hover {
  background: rgba(16, 185, 129, 0.35);
  color: #ffffff;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #e2e8f0;
  padding: 0.45rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  transition: background 0.2s;
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.text-muted { color: #64748b; }
.font-medium { font-weight: 500; }
</style>
