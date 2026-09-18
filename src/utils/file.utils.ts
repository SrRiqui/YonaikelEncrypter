/**
 * Utilidades de manipulación, lectura y conversión de archivos binarios y base64.
 */

/**
 * Lee un objeto File y lo retorna como un Uint8Array.
 */
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Lee un objeto File y lo retorna como string de texto.
 */
export async function readFileAsString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Convierte un arreglo de bytes (Uint8Array) a una cadena codificada en Base64.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodifica una cadena Base64 a su representación en Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
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
