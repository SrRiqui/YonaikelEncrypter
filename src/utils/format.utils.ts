/**
 * Utilidades de formateo visual de datos (tamaños, horas, nombres).
 */

/**
 * Convierte un número de bytes a una cadena legible (B, KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Obtiene la hora actual formateada en formato HH:MM:SS.
 */
export function formatCurrentTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Normaliza el nombre de un archivo removiendo el prefijo 'encrypted_' para descifrado.
 */
export function cleanEncryptedFileName(fileName: string): string {
  return fileName.replace(/^encrypted_/, '');
}
