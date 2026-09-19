import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

export class Base64CryptoService {
  /**
   * Codifica un archivo en una cadena Base64, aplicando XOR simétrico si se proporciona una clave.
   */
  public static async encrypt(file: File, secret?: string): Promise<string> {
    const bytes = await readFileAsBytes(file);
    return this.encryptBytes(bytes, secret);
  }

  /**
   * Codifica una cadena de texto en Base64 con protección opcional por clave.
   */
  public static async encryptText(text: string, secret?: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    return this.encryptBytes(bytes, secret);
  }

  private static encryptBytes(bytes: Uint8Array, secret?: string): string {
    if (!secret) {
      return bytesToBase64(bytes);
    }
    const secretBytes = new TextEncoder().encode(secret);
    const masked = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      masked[i] = bytes[i] ^ secretBytes[i % secretBytes.length];
    }
    return bytesToBase64(masked);
  }

  /**
   * Decodifica una cadena Base64 y reconstruye el archivo original.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream',
    secret?: string
  ): Promise<File> {
    const bytes = this.decryptToBytes(content, secret);
    return bytesToFile(bytes, outputFileName, mimeType);
  }

  /**
   * Decodifica una cadena Base64 a texto plano.
   */
  public static async decryptText(content: string, secret?: string): Promise<string> {
    const bytes = this.decryptToBytes(content, secret);
    return new TextDecoder().decode(bytes);
  }

  private static decryptToBytes(content: string, secret?: string): Uint8Array {
    const bytes = base64ToBytes(content);
    if (!secret) {
      return bytes;
    }
    const secretBytes = new TextEncoder().encode(secret);
    const unmasked = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      unmasked[i] = bytes[i] ^ secretBytes[i % secretBytes.length];
    }
    return unmasked;
  }
}
