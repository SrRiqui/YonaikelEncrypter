/**
 * Utilidades de manipulación, lectura y conversión de archivos binarios y base64.
 */

/**
 * Lee un objeto File y lo retorna como un Uint8Array.
 * Utiliza file.arrayBuffer() nativo con fallback a FileReader.
 */
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Lee un objeto File y lo retorna como string de texto.
 * Utiliza file.text() nativo con fallback a FileReader.
 */
export async function readFileAsString(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Convierte un arreglo de bytes (Uint8Array) a una cadena codificada en Base64.
 * Optimizado mediante procesamiento por lotes (chunks) para alto rendimiento y bajo consumo de memoria.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB por bloque
  const chunks: string[] = [];
  const len = bytes.length;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[]));
  }
  return btoa(chunks.join(''));
}

/**
 * Decodifica una cadena Base64 a su representación en Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convierte un Uint8Array a un objeto File descargable.
 */
export function bytesToFile(
  bytes: Uint8Array,
  fileName: string = 'decrypted_file',
  mimeType: string = 'application/octet-stream'
): File {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Genera un enlace de descarga en el navegador y simula el clic para descargarlo.
 */
export function triggerFileDownload(downloadUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Detecta la extensión probable de un archivo a partir de sus firmas de bytes (Magic Bytes).
 * Permite restaurar extensiones perdidas u ocultadas durante la encriptación.
 */
export function detectExtensionFromBytes(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 4) return null;

  // PDF: %PDF- (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }

  // PNG: \x89PNG\r\n\x1a\n (89 50 4E 47)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'png';
  }

  // JPEG / JPG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpg';
  }

  // GIF: GIF87a o GIF89a (47 49 46 38)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'gif';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // ZIP / Office (DOCX, XLSX, PPTX) / APK / JAR: PK\x03\x04 (50 4B 03 04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'zip';
  }

  // 7z: 7z\xBC\xAF (37 7A BC AF)
  if (bytes.length >= 4 && bytes[0] === 0x37 && bytes[1] === 0x7A && bytes[2] === 0xBC && bytes[3] === 0xAF) {
    return '7z';
  }

  // RAR: Rar! (52 61 72 21)
  if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) {
    return 'rar';
  }

  // MP3: ID3 (49 44 33) o frame sync (FF FB / FF F3)
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)
  ) {
    return 'mp3';
  }

  // MP4: ....ftyp (66 74 79 70)
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return 'mp4';
  }

  // Texto plano o JSON
  let isText = true;
  const sampleLen = Math.min(bytes.length, 512);
  for (let i = 0; i < sampleLen; i++) {
    const code = bytes[i];
    if (code === 0 || (code < 9 && code !== 0) || (code > 13 && code < 32)) {
      isText = false;
      break;
    }
  }

  if (isText) {
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(0, sampleLen)).trim();
      if ((decoded.startsWith('{') && decoded.endsWith('}')) || (decoded.startsWith('[') && decoded.endsWith(']'))) {
        return 'json';
      }
      return 'txt';
    } catch {
      // No es texto UTF-8 válido
    }
  }

  return null;
}
