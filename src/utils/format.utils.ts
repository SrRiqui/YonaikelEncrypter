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

export type ObfuscateNameStyle = 'datetime_hash' | 'compact' | 'timestamp' | 'token_date';

export interface ObfuscateNameOptions {
  style?: ObfuscateNameStyle;
  prefix?: string;
}

/**
 * Genera un nombre de archivo anonimizado combinando fecha, hora y tokens criptográficos,
 * ocultando intencionalmente cualquier extensión original.
 */
export function generateObfuscatedFileName(options?: ObfuscateNameOptions): string {
  const style = options?.style || 'datetime_hash';
  const rawPrefix = options?.prefix !== undefined ? options.prefix.trim() : 'enc';
  const prefix = rawPrefix ? `${rawPrefix}_` : '';

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Generar hash aleatorio criptográfico hexadecimal
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  switch (style) {
    case 'compact':
      // ej: vault_20260918_224512_a8f9
      return `${prefix}${year}${month}${day}_${hours}${minutes}${seconds}_${randomHex.substring(0, 4)}`;

    case 'timestamp':
      // ej: enc_1726718400_a8f9c123
      return `${prefix}${Math.floor(now.getTime() / 1000)}_${randomHex}`;

    case 'token_date':
      // ej: data_2026-09-18_a8f9c123
      return `${prefix}${year}-${month}-${day}_${randomHex}`;

    case 'datetime_hash':
    default:
      // ej: enc_2026-09-18_22-45-12_a8f9c1
      return `${prefix}${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${randomHex.substring(0, 6)}`;
  }
}

/**
 * Comprueba si una cadena de nombre de archivo posee una extensión reconocible.
 */
export function hasFileExtension(fileName: string): boolean {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return false;
  const ext = fileName.substring(lastDot + 1);
  return /^[a-zA-Z0-9]{1,10}$/.test(ext);
}
