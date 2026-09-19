<script lang="ts">
import { defineComponent, ref, onBeforeUnmount } from 'vue';
import type { CryptoAlgorithmId, DecryptedFileItem, MethodOption, QueuedFile, InputMode, KeyLength } from '../../types/crypto.types';
import { CryptoEngine } from '../../services/crypto';
import { readFileAsString, readFileAsBytes, triggerFileDownload, detectExtensionFromBytes } from '../../utils/file.utils';
import { formatFileSize, formatCurrentTime, cleanEncryptedFileName, hasFileExtension } from '../../utils/format.utils';
import { readKeyFromFile } from '../../utils/key.utils';

export default defineComponent({
  name: 'FileDecryptor',
  emits: ['go-home'],
  setup() {
    // Mode selection: file or text
    const inputMode = ref<InputMode>('file');

    // Key management
    const keyLength = ref<KeyLength>(6);
    const decryptionKey = ref<string>('');
    const keyFileInput = ref<HTMLInputElement | null>(null);
    const keyLoadedNotification = ref<string>('');

    // Algorithm selection
    const selectedAlgorithm = ref<CryptoAlgorithmId>('aes');
    const errorMessage = ref<string>('');

    // File mode state
    const fileInput = ref<HTMLInputElement | null>(null);
    const decryptQueue = ref<QueuedFile[]>([]);
    const decryptedFiles = ref<DecryptedFileItem[]>([]);
    const isProcessing = ref<boolean>(false);
    const isDragging = ref<boolean>(false);

    // Text mode state
    const textToDecrypt = ref<string>('');
    const decryptedTextResult = ref<string>('');
    const isTextProcessing = ref<boolean>(false);
    const isTextCopied = ref<boolean>(false);

    const methods: MethodOption[] = [
      {
        id: 'base64',
        title: 'Base64 Decoding',
        description: 'Decodifica archivos protegidos en formato base64',
        tag: 'Fast'
      },
      {
        id: 'aes',
        title: 'AES-GCM 256-bit',
        description: 'Desencriptación con verificación de integridad y autenticación',
        tag: 'Recomendado'
      },
      {
        id: 'custom',
        title: 'Custom Multi-Layer',
        description: 'Algoritmo exclusivo simétrico de múltiples fases con verificación de clave',
        tag: 'Custom'
      }
    ];

    const setKeyLength = (len: KeyLength) => {
      keyLength.value = len;
      keyLoadedNotification.value = '';
    };

    const triggerKeyFileInput = () => {
      keyFileInput.value?.click();
    };

    const handleKeyFileUpload = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      const file = target.files[0];
      try {
        const rawKey = await readKeyFromFile(file);
        const clean = rawKey.trim();
        if (clean.length === 12) {
          keyLength.value = 12;
        } else if (clean.length === 6) {
          keyLength.value = 6;
        }
        decryptionKey.value = clean;
        keyLoadedNotification.value = `Clave de ${clean.length} caracteres cargada desde ${file.name}`;
        errorMessage.value = '';
      } catch (err: any) {
        errorMessage.value = `Error al leer archivo de clave: ${err.message}`;
      } finally {
        if (keyFileInput.value) keyFileInput.value.value = '';
      }
    };

    const selectAlgorithm = (id: CryptoAlgorithmId) => {
      selectedAlgorithm.value = id;
      errorMessage.value = '';
    };

    // File mode handlers
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
      
      const currentKey = decryptionKey.value.trim();
      if (!currentKey) {
        errorMessage.value = 'Por favor ingresa o sube la clave de desencriptación antes de continuar.';
        return;
      }

      isProcessing.value = true;
      errorMessage.value = '';

      for (const item of decryptQueue.value) {
        if (item.status === 'completed') continue;

        try {
          item.status = 'processing';
          item.progress = 35;

          const fileContent = await readFileAsString(item.file);
          const baseCleanName = cleanEncryptedFileName(item.file.name);
          const outputName = `decrypted_${baseCleanName}`;

          const resultFile = await CryptoEngine.decrypt(fileContent, item.algorithm, outputName, currentKey);
          item.progress = 75;

          // Restauración inteligente de extensión si el archivo cifrado no tenía extensión
          let finalFile = resultFile;
          let finalName = resultFile.name;
          if (!hasFileExtension(finalName)) {
            const bytes = await readFileAsBytes(resultFile);
            const detectedExt = detectExtensionFromBytes(bytes);
            if (detectedExt) {
              finalName = `${finalName}.${detectedExt}`;
              finalFile = new File([resultFile], finalName, { type: resultFile.type });
            }
          }

          const downloadUrl = URL.createObjectURL(finalFile);

          decryptedFiles.value.unshift({
            id: item.id,
            name: finalName,
            size: finalFile.size,
            algorithm: item.algorithm,
            date: formatCurrentTime(),
            downloadUrl
          });

          item.status = 'completed';
          item.progress = 100;
        } catch (err: any) {
          item.status = 'error';
          item.error = err.message || 'Clave incorrecta o archivo dañado';
          errorMessage.value = 'Fallo al desencriptar: La clave es incorrecta o los datos están corruptos.';
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
      const file = decryptedFiles.value.find(f => f.id === id);
      if (file && file.downloadUrl) {
        URL.revokeObjectURL(file.downloadUrl);
      }
      decryptedFiles.value = decryptedFiles.value.filter(f => f.id !== id);
    };

    // Text mode handlers
    const processTextDecryption = async () => {
      if (!textToDecrypt.value.trim()) {
        errorMessage.value = 'Por favor ingresa el texto cifrado que deseas desencriptar.';
        return;
      }
      const currentKey = decryptionKey.value.trim();
      if (!currentKey) {
        errorMessage.value = 'Por favor ingresa o sube la clave de desencriptación.';
        return;
      }

      errorMessage.value = '';
      isTextProcessing.value = true;
      try {
        const result = await CryptoEngine.decryptText(
          textToDecrypt.value.trim(),
          selectedAlgorithm.value,
          currentKey
        );
        decryptedTextResult.value = result;
      } catch (err: any) {
        errorMessage.value = err.message || 'Error: Clave incorrecta o formato de texto cifrado no válido.';
        decryptedTextResult.value = '';
      } finally {
        isTextProcessing.value = false;
      }
    };

    const copyDecryptedText = async () => {
      if (!decryptedTextResult.value) return;
      try {
        await navigator.clipboard.writeText(decryptedTextResult.value);
        isTextCopied.value = true;
        setTimeout(() => {
          isTextCopied.value = false;
        }, 2000);
      } catch {
        // Fallback
      }
    };

    const downloadDecryptedTextFile = () => {
      if (!decryptedTextResult.value) return;
      const blob = new Blob([decryptedTextResult.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerFileDownload(url, 'texto_desencriptado.txt');
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const clearTextMode = () => {
      textToDecrypt.value = '';
      decryptedTextResult.value = '';
      errorMessage.value = '';
    };

    onBeforeUnmount(() => {
      decryptedFiles.value.forEach(f => {
        if (f.downloadUrl) {
          URL.revokeObjectURL(f.downloadUrl);
        }
      });
    });

    return {
      inputMode,
      keyLength,
      decryptionKey,
      keyFileInput,
      keyLoadedNotification,
      setKeyLength,
      triggerKeyFileInput,
      handleKeyFileUpload,
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
      formatFileSize,
      textToDecrypt,
      decryptedTextResult,
      isTextProcessing,
      isTextCopied,
      processTextDecryption,
      copyDecryptedText,
      downloadDecryptedTextFile,
      clearTextMode
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
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
        </div>
        <div>
          <h1 class="title">Módulo de Desencriptación</h1>
          <p class="subtitle">Recupera archivos y textos ingresando o subiendo tu clave de seguridad.</p>
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
      <div class="step-badge">Paso 1</div>
      <h2 class="section-title">Selecciona el Método Correspondiente</h2>
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

    <!-- Step 2: Decryption Key Input & Upload -->
    <section class="section">
      <div class="step-badge">Paso 2</div>
      <h2 class="section-title">Clave de Desencriptación</h2>

      <div class="key-panel">
        <div class="key-panel-header">
          <div class="length-selector">
            <span class="selector-label">Longitud Esperada:</span>
            <div class="pills-group">
              <button
                type="button"
                class="pill-btn"
                :class="{ active: keyLength === 6 }"
                @click="setKeyLength(6)"
              >
                6 Caracteres
              </button>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: keyLength === 12 }"
                @click="setKeyLength(12)"
              >
                12 Caracteres
              </button>
            </div>
          </div>

          <!-- Hidden Key File Input -->
          <input
            ref="keyFileInput"
            type="file"
            accept=".key,.txt"
            class="hidden-input"
            @change="handleKeyFileUpload"
          />

          <!-- Upload Key File Button -->
          <button
            type="button"
            class="btn-upload-key"
            @click="triggerKeyFileInput"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Subir Archivo de Clave (.key)</span>
          </button>
        </div>

        <div class="key-display-box">
          <div class="key-field-wrapper">
            <input
              v-model="decryptionKey"
              type="text"
              class="key-input"
              spellcheck="false"
              placeholder="Escribe o pega aquí la clave de desencriptación..."
              :maxlength="keyLength"
            />
            <span class="char-count">{{ decryptionKey.length }}/{{ keyLength }}</span>
          </div>
        </div>

        <div v-if="keyLoadedNotification" class="key-success-alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{{ keyLoadedNotification }}</span>
        </div>

        <p class="key-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Puedes escribir la clave manualmente o hacer clic en "Subir Archivo de Clave" para cargar el archivo .key descargado previamente.
        </p>
      </div>
    </section>

    <!-- Step 3: Input Mode (File or Text) -->
    <section class="section">
      <div class="step-badge">Paso 3</div>
      <div class="section-title-bar">
        <h2 class="section-title">Contenido a Desencriptar</h2>

        <!-- Mode Switcher -->
        <div class="mode-switch">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: inputMode === 'file' }"
            @click="inputMode = 'file'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Cargar Archivo</span>
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: inputMode === 'text' }"
            @click="inputMode = 'text'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            <span>Desencriptar Texto</span>
          </button>
        </div>
      </div>

      <!-- FILE MODE -->
      <div v-if="inputMode === 'file'" class="file-mode-container">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p class="drop-text">Arrastra y suelta tu archivo encriptado o <span class="highlight">haz clic para examinar</span></p>
            <p class="drop-sub">Algoritmo: <strong class="active-badge">{{ selectedAlgorithm.toUpperCase() }}</strong></p>
          </div>
        </div>

        <!-- Decrypt Queue -->
        <div v-if="decryptQueue.length > 0" class="queue-card">
          <div class="queue-header">
            <div>
              <span class="step-badge inline">Cola de Proceso</span>
              <h3 class="queue-title">Archivos listos para desencriptar ({{ decryptQueue.length }})</h3>
            </div>
            <button
              class="btn-decrypt"
              :disabled="isProcessing"
              @click="processQueue"
            >
              <svg v-if="!isProcessing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              <span v-if="isProcessing">Desencriptando...</span>
              <span v-else>Desencriptar Ahora</span>
            </button>
          </div>

          <div class="queue-list">
            <div v-for="item in decryptQueue" :key="item.id" class="queue-item">
              <div class="item-info">
                <span class="file-name">{{ item.file.name }}</span>
                <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
                <span v-if="item.error" class="error-inline">{{ item.error }}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: `${item.progress}%` }"></div>
              </div>
              <div class="status-badge" :class="item.status">
                {{ item.status }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TEXT MODE -->
      <div v-else class="text-mode-container">
        <div class="text-input-card">
          <div class="text-header">
            <label class="text-label">Texto cifrado a desencriptar:</label>
            <span class="text-count">{{ textToDecrypt.length }} caracteres</span>
          </div>
          <textarea
            v-model="textToDecrypt"
            class="main-textarea font-mono"
            rows="5"
            placeholder="Pega aquí la cadena o texto cifrado..."
          ></textarea>

          <div class="text-actions-bar">
            <button
              type="button"
              class="btn-clear"
              :disabled="!textToDecrypt && !decryptedTextResult"
              @click="clearTextMode"
            >
              Limpiar
            </button>
            <button
              type="button"
              class="btn-decrypt"
              :disabled="isTextProcessing || !textToDecrypt.trim()"
              @click="processTextDecryption"
            >
              <svg v-if="!isTextProcessing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              <span v-if="isTextProcessing">Desencriptando...</span>
              <span v-else>Desencriptar Texto</span>
            </button>
          </div>
        </div>

        <!-- Decrypted Text Result -->
        <div v-if="decryptedTextResult" class="text-result-card">
          <div class="result-header">
            <div class="result-title-group">
              <span class="result-tag success">Texto Recuperado</span>
              <span class="result-meta">Descifrado con éxito &bull; {{ decryptedTextResult.length }} caracteres</span>
            </div>
            <div class="result-actions">
              <button
                type="button"
                class="btn-result-action"
                :class="{ copied: isTextCopied }"
                @click="copyDecryptedText"
              >
                <svg v-if="!isTextCopied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ isTextCopied ? '¡Copiado!' : 'Copiar Texto' }}</span>
              </button>

              <button
                type="button"
                class="btn-result-action primary"
                @click="downloadDecryptedTextFile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Descargar (.txt)</span>
              </button>
            </div>
          </div>
          <textarea
            :value="decryptedTextResult"
            class="result-textarea clean-text"
            rows="5"
            readonly
          ></textarea>
        </div>
      </div>
    </section>

    <!-- Recovered Files History (File Mode) -->
    <section v-if="decryptedFiles.length > 0 && inputMode === 'file'" class="section">
      <div class="step-badge success">Completado</div>
      <h2 class="section-title">Archivos Restaurados Disponibles</h2>
      <div class="files-table-container">
        <table class="files-table">
          <thead>
            <tr>
              <th>Nombre del Archivo</th>
              <th>Tamaño</th>
              <th>Algoritmo</th>
              <th>Hora</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in decryptedFiles" :key="file.id">
              <td>
                <div class="file-name-cell">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span class="font-medium">{{ file.name }}</span>
                </div>
              </td>
              <td>{{ formatFileSize(file.size) }}</td>
              <td>
                <span class="algo-badge">{{ file.algorithm.toUpperCase() }}</span>
              </td>
              <td class="text-muted">{{ file.date }}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-download" @click="downloadFile(file)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Descargar</span>
                  </button>
                  <button class="btn-icon delete" title="Eliminar" @click="deleteFile(file.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}

.dashboard-header {
  margin-bottom: 2rem;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.header-icon {
  background: #141a26;
  color: #f1f5f9;
  padding: 0.9rem;
  border-radius: 14px;
  display: flex;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
}

.subtitle {
  color: #8392a5;
  margin-top: 0.25rem;
  font-size: 0.92rem;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  padding: 0.9rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.step-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.step-badge.inline {
  margin-bottom: 0.2rem;
}

.step-badge.success {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.method-card {
  background: rgba(12, 16, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.4rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.method-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  background: rgba(17, 23, 36, 0.85);
}

.method-card.selected {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.tag {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.tag-highlight {
  background: rgba(255, 255, 255, 0.09);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #64748b;
  transition: all 0.2s ease;
}

.method-card.selected .radio-indicator {
  border-color: #f1f5f9;
  background: #f1f5f9;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.45rem 0;
}

.card-desc {
  font-size: 0.85rem;
  color: #8392a5;
  margin: 0;
  line-height: 1.45;
}

/* Key Panel */
.key-panel {
  background: rgba(12, 16, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
}

.key-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.length-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selector-label {
  font-size: 0.88rem;
  color: #94a3b8;
  font-weight: 500;
}

.pills-group {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.25rem;
  gap: 0.25rem;
}

.pill-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pill-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.btn-upload-key {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #171e2c;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload-key:hover {
  background: #202a3d;
  border-color: rgba(255, 255, 255, 0.26);
}

.key-display-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.key-field-wrapper {
  position: relative;
  flex: 1;
  min-width: 260px;
}

.key-input {
  width: 100%;
  background: rgba(8, 11, 17, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  padding: 0.75rem 3.5rem 0.75rem 1rem;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s;
}

.key-input:focus {
  border-color: rgba(255, 255, 255, 0.35);
}

.char-count {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #64748b;
  pointer-events: none;
}

.key-success-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  font-size: 0.85rem;
}

.key-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #8392a5;
  font-size: 0.82rem;
  margin: 1rem 0 0 0;
  line-height: 1.4;
}

/* Mode Switcher */
.mode-switch {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.25rem;
  gap: 0.25rem;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  color: #f1f5f9;
}

.mode-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* File Dropzone */
.dropzone {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  background: rgba(12, 16, 25, 0.6);
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.25s ease;
}

.dropzone:hover {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.03);
}

.dropzone.dragging {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.06);
}

.hidden-input {
  display: none;
}

.dropzone-content svg {
  color: #94a3b8;
  margin-bottom: 1rem;
}

.drop-text {
  font-size: 1.05rem;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
}

.highlight {
  color: #ffffff;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.drop-sub {
  font-size: 0.85rem;
  color: #8392a5;
  margin: 0;
}

.active-badge {
  color: #cbd5e1;
}

.queue-card {
  margin-top: 1.5rem;
  background: rgba(12, 16, 25, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  font-size: 1.05rem;
  color: #f1f5f9;
  font-weight: 600;
}

.btn-decrypt {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #171e2c;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.92rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  transition: all 0.2s;
}

.btn-decrypt:hover:not(:disabled) {
  background: #202a3d;
  border-color: rgba(255, 255, 255, 0.26);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.btn-decrypt:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  font-size: 0.92rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
}

.error-inline {
  font-size: 0.78rem;
  color: #fca5a5;
  margin-top: 0.25rem;
}

.progress-bar-bg {
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #94a3b8;
  transition: width 0.3s ease;
}

.status-badge {
  font-size: 0.72rem;
  text-transform: capitalize;
  text-align: center;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-badge.completed { background: rgba(255, 255, 255, 0.1); color: #ffffff; border-color: rgba(255, 255, 255, 0.15); }
.status-badge.processing { background: rgba(255, 255, 255, 0.06); color: #cbd5e1; }
.status-badge.error { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }

/* Text Mode Styles */
.text-input-card {
  background: rgba(12, 16, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
}

.text-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.text-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #cbd5e1;
}

.text-count {
  font-size: 0.8rem;
  color: #64748b;
}

.main-textarea {
  width: 100%;
  background: rgba(8, 11, 17, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.55;
  padding: 1rem;
  border-radius: 12px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.main-textarea.font-mono {
  font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
}

.main-textarea:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.text-actions-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.btn-clear {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.btn-clear:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Text Result Card */
.text-result-card {
  margin-top: 1.5rem;
  background: rgba(12, 16, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.result-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.result-tag {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

.result-tag.success {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.result-meta {
  font-size: 0.82rem;
  color: #8392a5;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-result-action {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  padding: 0.55rem 0.95rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-result-action:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.btn-result-action.copied {
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.btn-result-action.primary {
  background: #171e2c;
  border-color: rgba(255, 255, 255, 0.18);
  color: #f8fafc;
}

.result-textarea {
  width: 100%;
  background: rgba(6, 9, 14, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.55;
  padding: 1rem;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
}

.result-textarea.clean-text {
  color: #f8fafc;
}

/* Files Table Container */
.files-table-container {
  background: rgba(12, 16, 25, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.files-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
}

.files-table th {
  background: rgba(16, 22, 34, 0.85);
  padding: 0.9rem 1.25rem;
  color: #94a3b8;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.files-table td {
  padding: 0.95rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #f1f5f9;
}

.algo-badge {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 500;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 0.4rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.text-muted { color: #64748b; }
.font-medium { font-weight: 500; }
</style>
