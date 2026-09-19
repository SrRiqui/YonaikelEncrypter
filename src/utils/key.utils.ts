/**
 * Utilidades para la generación, lectura y descarga de claves de encriptación seguras.
 */

export type KeyLength = 6 | 12;

// Alfabeto criptográfico legible (sin caracteres confusos como O/0 o I/l)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * Genera una clave aleatoria criptográficamente segura con la longitud especificada (6 o 12 caracteres).
 */
export function generateRandomKey(length: KeyLength): string {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let key = '';
  for (let i = 0; i < length; i++) {
    key += CHARSET[randomValues[i] % CHARSET.length];
  }
  return key;
}

/**
 * Descarga la clave generada como un archivo de texto .key para su custodia y posterior uso.
 */
export function downloadKeyFile(key: string, customName?: string): void {
  const fileName = customName || `yonaikel_clave_${key.length}chars.key`;
  const blob = new Blob([key.trim()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Lee el contenido de un archivo de clave (.key o .txt) y retorna la clave limpia.
 */
export async function readKeyFromFile(file: File): Promise<string> {
  const text = await file.text();
  return text.trim();
}
