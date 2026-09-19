<script lang="ts">
import { defineComponent, ref, onBeforeUnmount } from 'vue';
import type { CryptoAlgorithmId, EncryptedFileItem, MethodOption, QueuedFile, InputMode, KeyLength } from '../../types/crypto.types';
import { CryptoEngine } from '../../services/crypto';
import { triggerFileDownload } from '../../utils/file.utils';
import { formatFileSize, formatCurrentTime, generateObfuscatedFileName, hasFileExtension, type ObfuscateNameStyle } from '../../utils/format.utils';
import { generateRandomKey, downloadKeyFile } from '../../utils/key.utils';

export default defineComponent({
  name: 'FileEncrypter',
  emits: ['go-home'],
  setup() {
    // Mode selection: file or text
    const inputMode = ref<InputMode>('file');

    // Key management
    const keyLength = ref<KeyLength>(6);
    const encryptionKey = ref<string>(generateRandomKey(6));
    const isKeyCopied = ref<boolean>(false);

    // Algorithm selection
    const selectedAlgorithm = ref<CryptoAlgorithmId>('aes');
    const errorMessage = ref<string>('');

    // File mode state
    const fileInput = ref<HTMLInputElement | null>(null);
    const uploadQueue = ref<QueuedFile[]>([]);
    const encryptedFiles = ref<EncryptedFileItem[]>([]);
    const isProcessing = ref<boolean>(false);
    const isDragging = ref<boolean>(false);

    // File name & extension obfuscation state
    const hideFileNameAndExt = ref<boolean>(false);
    const obfuscateStyle = ref<ObfuscateNameStyle>('datetime_hash');
    const customPrefix = ref<string>('enc');
    const previewObfuscatedName = ref<string>('');

    const updatePreviewName = () => {
      previewObfuscatedName.value = generateObfuscatedFileName({
        style: obfuscateStyle.value,
        prefix: customPrefix.value.trim() || 'enc'
      });
    };

    updatePreviewName();

    const setObfuscateStyle = (style: ObfuscateNameStyle) => {
      obfuscateStyle.value = style;
      updatePreviewName();
    };

    // Text mode state
    const textToEncrypt = ref<string>('');
    const encryptedTextResult = ref<string>('');
    const isTextProcessing = ref<boolean>(false);
    const isTextCopied = ref<boolean>(false);

    const methods: MethodOption[] = [
      {
        id: 'base64',
        title: 'Base64 Encoding',
        description: 'Codificación estándar protegida con clave XOR',
        tag: 'Fast'
      },
      {
        id: 'aes',
        title: 'AES-GCM 256-bit',
        description: 'Cifrado autenticado de grado militar con Web Crypto API',
        tag: 'Recomendado'
      },
      {
        id: 'custom',
        title: 'Custom Multi-Layer',
        description: 'Algoritmo exclusivo por capas con rotación y suma de verificación',
        tag: 'Custom'
      }
    ];

    // Key handlers
    const setKeyLength = (len: KeyLength) => {
      keyLength.value = len;
      encryptionKey.value = generateRandomKey(len);
      isKeyCopied.value = false;
    };

    const regenerateKey = () => {
      encryptionKey.value = generateRandomKey(keyLength.value);
      isKeyCopied.value = false;
    };

    const copyKeyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(encryptionKey.value);
        isKeyCopied.value = true;
        setTimeout(() => {
          isKeyCopied.value = false;
        }, 2000);
      } catch {
        // Fallback si clipboard API no está disponible
      }
    };

    const downloadKey = () => {
      downloadKeyFile(encryptionKey.value);
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
        uploadQueue.value.push({
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
      if (isProcessing.value || uploadQueue.value.length === 0) return;
      isProcessing.value = true;
      errorMessage.value = '';

      const currentKey = encryptionKey.value.trim();

      for (const item of uploadQueue.value) {
        if (item.status === 'completed') continue;

        try {
          item.status = 'processing';
          item.progress = 35;

          const resultString = await CryptoEngine.encrypt(item.file, item.algorithm, currentKey);
          item.progress = 75;

          const blob = new Blob([resultString], { type: 'text/plain' });
          const downloadUrl = URL.createObjectURL(blob);

          const outputFileName = hideFileNameAndExt.value
            ? generateObfuscatedFileName({
                style: obfuscateStyle.value,
                prefix: customPrefix.value.trim() || 'enc'
              })
            : `encrypted_${item.file.name}`;

          encryptedFiles.value.unshift({
            id: item.id,
            name: outputFileName,
            size: blob.size,
            algorithm: item.algorithm,
            date: formatCurrentTime(),
            downloadUrl
          });

          item.status = 'completed';
          item.progress = 100;
        } catch (err: any) {
          item.status = 'error';
          item.error = err.message || 'Error durante la encriptación';
        }
      }

      setTimeout(() => {
        uploadQueue.value = uploadQueue.value.filter(f => f.status !== 'completed');
      }, 1500);

      isProcessing.value = false;
    };

    const downloadFile = (fileItem: EncryptedFileItem) => {
      triggerFileDownload(fileItem.downloadUrl, fileItem.name);
    };

    const deleteFile = (id: string) => {
      const file = encryptedFiles.value.find(f => f.id === id);
      if (file && file.downloadUrl) {
        URL.revokeObjectURL(file.downloadUrl);
      }
      encryptedFiles.value = encryptedFiles.value.filter(f => f.id !== id);
    };

    // Text mode handlers
    const processTextEncryption = async () => {
      if (!textToEncrypt.value.trim()) {
        errorMessage.value = 'Por favor ingresa un texto para encriptar.';
        return;
      }
      errorMessage.value = '';
      isTextProcessing.value = true;
      try {
        const result = await CryptoEngine.encryptText(
          textToEncrypt.value,
          selectedAlgorithm.value,
          encryptionKey.value.trim()
        );
        encryptedTextResult.value = result;
      } catch (err: any) {
        errorMessage.value = err.message || 'Error al encriptar el texto.';
      } finally {
        isTextProcessing.value = false;
      }
    };

    const copyEncryptedText = async () => {
      if (!encryptedTextResult.value) return;
      try {
        await navigator.clipboard.writeText(encryptedTextResult.value);
        isTextCopied.value = true;
        setTimeout(() => {
          isTextCopied.value = false;
        }, 2000);
      } catch {
        // Fallback
      }
    };

    const downloadEncryptedTextFile = () => {
      if (!encryptedTextResult.value) return;
      const blob = new Blob([encryptedTextResult.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerFileDownload(url, `texto_cifrado_${selectedAlgorithm.value}.enc`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const clearTextMode = () => {
      textToEncrypt.value = '';
      encryptedTextResult.value = '';
      errorMessage.value = '';
    };

    onBeforeUnmount(() => {
      encryptedFiles.value.forEach(f => {
        if (f.downloadUrl) {
          URL.revokeObjectURL(f.downloadUrl);
        }
      });
    });

    return {
      inputMode,
      keyLength,
      encryptionKey,
      isKeyCopied,
      setKeyLength,
      regenerateKey,
      copyKeyToClipboard,
      downloadKey,
      fileInput,
      selectedAlgorithm,
      uploadQueue,
      encryptedFiles,
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
      textToEncrypt,
      encryptedTextResult,
      isTextProcessing,
      isTextCopied,
      processTextEncryption,
      copyEncryptedText,
      downloadEncryptedTextFile,
      clearTextMode,
      hideFileNameAndExt,
      obfuscateStyle,
      customPrefix,
      previewObfuscatedName,
      updatePreviewName,
      setObfuscateStyle,
      hasFileExtension
    };
  }
});
</script>

<template>
  <div class="encrypter-dashboard">
    <!-- Header with Back Button -->
    <header class="dashboard-header">
      <div class="header-left">
        <button class="btn-back" @click="$emit('go-home')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span>Inicio</span>
        </button>
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div>
          <h1 class="title">Módulo de Encriptación</h1>
          <p class="subtitle">Cifra archivos o textos con claves seguras y algoritmos criptográficos.</p>
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
      <h2 class="section-title">Selecciona el Método de Encriptación</h2>
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

    <!-- Step 2: Key Generation & Management -->
    <section class="section">
      <div class="step-badge">Paso 2</div>
      <h2 class="section-title">Clave de Encriptación</h2>
      
      <div class="key-panel">
        <div class="key-panel-header">
          <div class="length-selector">
            <span class="selector-label">Longitud de Clave:</span>
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

          <span class="key-badge">Generada Automáticamente</span>
        </div>

        <div class="key-display-box">
          <div class="key-field-wrapper">
            <input
              v-model="encryptionKey"
              type="text"
              class="key-input"
              spellcheck="false"
              placeholder="Clave de seguridad"
              :maxlength="keyLength"
            />
            <span class="char-count">{{ encryptionKey.length }}/{{ keyLength }}</span>
          </div>

          <div class="key-actions">
            <button
              type="button"
              class="btn-key-action"
              title="Generar nueva clave aleatoria"
              @click="regenerateKey"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              <span>Regenerar</span>
            </button>

            <button
              type="button"
              class="btn-key-action"
              :class="{ copied: isKeyCopied }"
              title="Copiar clave al portapapeles"
              @click="copyKeyToClipboard"
            >
              <svg v-if="!isKeyCopied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ isKeyCopied ? '¡Copiada!' : 'Copiar' }}</span>
            </button>

            <button
              type="button"
              class="btn-key-action primary"
              title="Descargar archivo de clave .key"
              @click="downloadKey"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Descargar Clave (.key)</span>
            </button>
          </div>
        </div>

        <p class="key-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Guarda o descarga esta clave. La necesitarás exactamente para desencriptar tu archivo o texto más adelante.
        </p>
      </div>
    </section>

    <!-- Step 3: Input Mode (File or Text) -->
    <section class="section">
      <div class="step-badge">Paso 3</div>
      <div class="section-title-bar">
        <h2 class="section-title">Contenido a Encriptar</h2>
        
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
            <span>Encriptar Texto</span>
          </button>
        </div>
      </div>

      <!-- FILE MODE -->
      <div v-if="inputMode === 'file'" class="file-mode-container">
        <!-- Obfuscation and Hide Extension Option -->
        <div class="anonymize-panel" :class="{ active: hideFileNameAndExt }">
          <div class="anonymize-header" @click="hideFileNameAndExt = !hideFileNameAndExt; updatePreviewName()">
            <div class="anonymize-info">
              <div class="anonymize-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              </div>
              <div>
                <div class="anonymize-title-row">
                  <span class="anonymize-title">Ocultar nombre y extensión del archivo</span>
                  <span class="privacy-badge">Máxima Confidencialidad</span>
                </div>
                <p class="anonymize-desc">
                  Sustituye el nombre real por una marca temporal (fecha y hora) con token aleatorio y elimina totalmente la extensión (.pdf, .png, etc.).
                </p>
              </div>
            </div>

            <div class="toggle-switch-wrapper" @click.stop>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  v-model="hideFileNameAndExt"
                  @change="updatePreviewName"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- Expanded configuration when active -->
          <div v-if="hideFileNameAndExt" class="anonymize-body">
            <div class="pattern-selector">
              <span class="sub-label">Formato de nombre habitual:</span>
              <div class="pattern-buttons">
                <button
                  type="button"
                  class="pattern-btn"
                  :class="{ active: obfuscateStyle === 'datetime_hash' }"
                  @click="setObfuscateStyle('datetime_hash')"
                >
                  <span class="pattern-name">Fecha, Hora y Hash (Recomendado)</span>
                  <span class="pattern-example">ej. enc_2026-09-18_22-45-12_a8f9c1</span>
                </button>
                <button
                  type="button"
                  class="pattern-btn"
                  :class="{ active: obfuscateStyle === 'compact' }"
                  @click="setObfuscateStyle('compact')"
                >
                  <span class="pattern-name">Compacto (YYYYMMDD_HHMMSS)</span>
                  <span class="pattern-example">ej. enc_20260918_224512_a8f9</span>
                </button>
                <button
                  type="button"
                  class="pattern-btn"
                  :class="{ active: obfuscateStyle === 'timestamp' }"
                  @click="setObfuscateStyle('timestamp')"
                >
                  <span class="pattern-name">Timestamp Unix + Hash</span>
                  <span class="pattern-example">ej. enc_1726718400_a8f9c123</span>
                </button>
                <button
                  type="button"
                  class="pattern-btn"
                  :class="{ active: obfuscateStyle === 'token_date' }"
                  @click="setObfuscateStyle('token_date')"
                >
                  <span class="pattern-name">Token + Fecha</span>
                  <span class="pattern-example">ej. enc_2026-09-18_a8f9c123</span>
                </button>
              </div>
            </div>

            <div class="prefix-and-preview-row">
              <div class="prefix-input-group">
                <label class="sub-label" for="custom-prefix">Prefijo opcional:</label>
                <div class="prefix-input-wrapper">
                  <input
                    id="custom-prefix"
                    type="text"
                    v-model="customPrefix"
                    maxlength="12"
                    placeholder="enc"
                    class="prefix-input"
                    @input="updatePreviewName"
                  />
                  <span class="prefix-separator">_</span>
                </div>
              </div>

              <div class="preview-box">
                <div class="preview-header">
                  <span class="sub-label">Vista previa del archivo resultante:</span>
                  <span class="badge-no-ext-alert">Sin Extensión</span>
                </div>
                <div class="preview-name-display">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  <code class="preview-code">{{ previewObfuscatedName }}</code>
                  <button
                    type="button"
                    class="btn-refresh-preview"
                    title="Generar nueva muestra"
                    @click="updatePreviewName"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
            <p class="drop-text">Arrastra y suelta tus archivos aquí o <span class="highlight">haz clic para examinar</span></p>
            <p class="drop-sub">Algoritmo: <strong class="active-badge">{{ selectedAlgorithm.toUpperCase() }}</strong> &bull; Clave de {{ encryptionKey.length }} caracteres</p>
          </div>
        </div>

        <!-- File Queue -->
        <div v-if="uploadQueue.length > 0" class="queue-card">
          <div class="queue-header">
            <div>
              <span class="step-badge inline">Cola de Proceso</span>
              <h3 class="queue-title">Archivos listos para procesar ({{ uploadQueue.length }})</h3>
            </div>
            <button
              class="btn-encrypt"
              :disabled="isProcessing"
              @click="processQueue"
            >
              <svg v-if="!isProcessing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span v-if="isProcessing">Encriptando...</span>
              <span v-else>Encriptar Ahora</span>
            </button>
          </div>

          <div class="queue-list">
            <div v-for="item in uploadQueue" :key="item.id" class="queue-item">
              <div class="item-info">
                <span class="file-name">{{ item.file.name }}</span>
                <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
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
            <label class="text-label">Texto plano a encriptar:</label>
            <span class="text-count">{{ textToEncrypt.length }} caracteres</span>
          </div>
          <textarea
            v-model="textToEncrypt"
            class="main-textarea"
            rows="5"
            placeholder="Escribe o pega aquí el texto confidencial que deseas encriptar..."
          ></textarea>
          
          <div class="text-actions-bar">
            <button
              type="button"
              class="btn-clear"
              :disabled="!textToEncrypt && !encryptedTextResult"
              @click="clearTextMode"
            >
              Limpiar
            </button>
            <button
              type="button"
              class="btn-encrypt"
              :disabled="isTextProcessing || !textToEncrypt.trim()"
              @click="processTextEncryption"
            >
              <svg v-if="!isTextProcessing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span v-if="isTextProcessing">Encriptando...</span>
              <span v-else>Encriptar Texto</span>
            </button>
          </div>
        </div>

        <!-- Encrypted Text Result -->
        <div v-if="encryptedTextResult" class="text-result-card">
          <div class="result-header">
            <div class="result-title-group">
              <span class="result-tag">Resultado Cifrado</span>
              <span class="result-meta">Algoritmo: {{ selectedAlgorithm.toUpperCase() }} &bull; Clave: {{ encryptionKey.length }} chars</span>
            </div>
            <div class="result-actions">
              <button
                type="button"
                class="btn-result-action"
                :class="{ copied: isTextCopied }"
                @click="copyEncryptedText"
              >
                <svg v-if="!isTextCopied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ isTextCopied ? '¡Texto Copiado!' : 'Copiar Cifrado' }}</span>
              </button>

              <button
                type="button"
                class="btn-result-action primary"
                @click="downloadEncryptedTextFile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Descargar (.enc)</span>
              </button>
            </div>
          </div>
          <textarea
            :value="encryptedTextResult"
            class="result-textarea"
            rows="5"
            readonly
          ></textarea>
        </div>
      </div>
    </section>

    <!-- Processed Files History (File Mode) -->
    <section v-if="encryptedFiles.length > 0 && inputMode === 'file'" class="section">
      <div class="step-badge success">Completado</div>
      <h2 class="section-title">Archivos Encriptados Disponibles</h2>
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
            <tr v-for="file in encryptedFiles" :key="file.id">
              <td>
                <div class="file-name-cell">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span class="font-medium">{{ file.name }}</span>
                  <span v-if="!hasFileExtension(file.name)" class="badge-no-ext" title="Nombre y extensión ocultados para máxima privacidad">Sin extensión</span>
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
.encrypter-dashboard {
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

.key-badge {
  font-size: 0.72rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-weight: 500;
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
  min-width: 220px;
}

.key-input {
  width: 100%;
  background: rgba(8, 11, 17, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.15rem;
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

.key-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-key-action {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.65rem 0.95rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-key-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-key-action.copied {
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.btn-key-action.primary {
  background: #171e2c;
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.16);
}

.btn-key-action.primary:hover {
  background: #202a3d;
  border-color: rgba(255, 255, 255, 0.26);
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

/* Mode switcher */
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

.btn-encrypt {
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

.btn-encrypt:hover:not(:disabled) {
  background: #202a3d;
  border-color: rgba(255, 255, 255, 0.26);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.btn-encrypt:disabled {
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
  font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  padding: 1rem;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  word-break: break-all;
  box-sizing: border-box;
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

/* Anonymization Panel & Controls */
.anonymize-panel {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  transition: all 0.25s ease;
}

.anonymize-panel.active {
  border-color: rgba(99, 102, 241, 0.35);
  background: rgba(15, 23, 42, 0.85);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
}

.anonymize-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.4rem;
  cursor: pointer;
  user-select: none;
  gap: 1rem;
}

.anonymize-info {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.anonymize-icon {
  background: rgba(99, 102, 241, 0.12);
  color: #818cf8;
  padding: 0.6rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.2);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.anonymize-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.anonymize-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: #f8fafc;
}

.privacy-badge {
  font-size: 0.68rem;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.anonymize-desc {
  font-size: 0.84rem;
  color: #94a3b8;
  margin: 0.25rem 0 0;
  line-height: 1.4;
}

/* Toggle Switch */
.toggle-switch-wrapper {
  flex-shrink: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.12);
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #cbd5e1;
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #6366f1;
  border-color: #818cf8;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
  background-color: #ffffff;
}

/* Anonymize Body */
.anonymize-body {
  padding: 1.25rem 1.4rem 1.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sub-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.pattern-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.65rem;
}

.pattern-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pattern-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.pattern-btn.active {
  background: rgba(99, 102, 241, 0.14);
  border-color: #818cf8;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
}

.pattern-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f1f5f9;
}

.pattern-example {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 0.2rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.pattern-btn.active .pattern-example {
  color: #a5b4fc;
}

.prefix-and-preview-row {
  display: flex;
  align-items: flex-end;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.prefix-input-group {
  flex: 0 0 160px;
}

.prefix-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 0.6rem;
}

.prefix-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 0.85rem;
  padding: 0.5rem 0;
  font-family: ui-monospace, monospace;
}

.prefix-separator {
  color: #64748b;
  font-weight: 600;
}

.preview-box {
  flex: 1;
  min-width: 260px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.preview-header .sub-label {
  margin-bottom: 0;
}

.badge-no-ext-alert {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
  padding: 0.12rem 0.45rem;
  border-radius: 5px;
  letter-spacing: 0.02em;
}

.preview-name-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  color: #94a3b8;
}

.preview-code {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.84rem;
  color: #38bdf8;
  word-break: break-all;
}

.btn-refresh-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.3rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-refresh-preview:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

/* Badge No Extension in Results Table */
.badge-no-ext {
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(244, 63, 94, 0.12);
  color: #f43f5e;
  border: 1px solid rgba(244, 63, 94, 0.25);
  padding: 0.15rem 0.45rem;
  border-radius: 5px;
  margin-left: 0.5rem;
}
</style>
