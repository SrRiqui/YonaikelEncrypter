import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

export class AesCryptoService {
  private static readonly DEFAULT_SECRET = 'VaultEncrypterSecretKey2026';
  private static readonly IV_LENGTH_BYTES = 12;

  /**
   * Deriva una clave CryptoKey simétrica de 256 bits a partir de una frase secreta.
   */
  private static async deriveKey(secret: string = this.DEFAULT_SECRET): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encripta un archivo utilizando AES-GCM con un vector de inicialización (IV) de 12 bytes.
   * Retorna una cadena Base64 que concatena IV + Texto Cifrado.
   */
  public static async encrypt(file: File, secret: string = this.DEFAULT_SECRET): Promise<string> {
    const plainBytes = await readFileAsBytes(file);
    const key = await this.deriveKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH_BYTES));

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes as BufferSource);

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return bytesToBase64(combined);
  }

  /**
   * Desencripta una cadena Base64 previamente cifrada con AES-GCM.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream',
    secret: string = this.DEFAULT_SECRET
  ): Promise<File> {
    const combined = base64ToBytes(content);
    if (combined.length < this.IV_LENGTH_BYTES + 1) {
      throw new Error('AES: El contenido es demasiado corto para contener el IV y los datos cifrados.');
    }

    const iv = combined.slice(0, this.IV_LENGTH_BYTES);
    const ciphertext = combined.slice(this.IV_LENGTH_BYTES);
    const key = await this.deriveKey(secret);

    try {
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      return bytesToFile(new Uint8Array(decrypted), outputFileName, mimeType);
    } catch {
      throw new Error('AES: Fallo de autenticación o descifrado (clave incorrecta o datos corruptos).');
    }
  }
}
