import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

export class CustomLayerCryptoService {
  private static readonly KEY_LENGTH_BYTES = 16;
  private static readonly MAGIC_CHECKSUM_BYTES = 4;

  private static rotateByte(byte: number, shift: number): number {
    return (byte + shift) % 256;
  }

  private static unrotateByte(byte: number, shift: number): number {
    return (byte - shift + 256) % 256;
  }

  /**
   * Genera una máscara de bytes a partir del secreto dado.
   */
  private static deriveSecretMask(secret?: string): Uint8Array {
    const encoder = new TextEncoder();
    const str = secret || 'DefaultYonaikelSecret2026';
    const raw = encoder.encode(str);
    const mask = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      mask[i] = raw[i % raw.length] ^ ((i * 31 + 17) % 256);
    }
    return mask;
  }

  private static computeChecksum(secretMask: Uint8Array, salt: Uint8Array): Uint8Array {
    const checksum = new Uint8Array(this.MAGIC_CHECKSUM_BYTES);
    for (let i = 0; i < this.MAGIC_CHECKSUM_BYTES; i++) {
      checksum[i] = (secretMask[i % secretMask.length] ^ salt[i % salt.length] ^ (i * 53 + 7)) % 256;
    }
    return checksum;
  }

  /**
   * Encripta un archivo con algoritmo por capas con salting y protección por clave.
   */
  public static async encrypt(file: File, secret?: string): Promise<string> {
    const plainBytes = await readFileAsBytes(file);
    return this.encryptBytes(plainBytes, secret);
  }

  /**
   * Encripta texto directamente.
   */
  public static async encryptText(text: string, secret?: string): Promise<string> {
    const encoder = new TextEncoder();
    const plainBytes = encoder.encode(text);
    return this.encryptBytes(plainBytes, secret);
  }

  private static encryptBytes(plainBytes: Uint8Array, secret?: string): string {
    const salt = crypto.getRandomValues(new Uint8Array(this.KEY_LENGTH_BYTES));
    const mask = this.deriveSecretMask(secret);
    const checksum = this.computeChecksum(mask, salt);

    // Clave efectiva combinando salt y secreto
    const effectiveKey = new Uint8Array(this.KEY_LENGTH_BYTES);
    for (let i = 0; i < this.KEY_LENGTH_BYTES; i++) {
      effectiveKey[i] = salt[i] ^ mask[i % mask.length];
    }

    const shift = effectiveKey.reduce((acc, b) => (acc + b) % 256, 0) || 1;

    const transformed = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      const xored = plainBytes[i] ^ effectiveKey[i % effectiveKey.length];
      transformed[i] = this.rotateByte(xored, shift);
    }

    // Estructura: [salt (16)] + [checksum (4)] + [datos transformados]
    const combined = new Uint8Array(salt.length + checksum.length + transformed.length);
    combined.set(salt, 0);
    combined.set(checksum, salt.length);
    combined.set(transformed, salt.length + checksum.length);

    return bytesToBase64(combined);
  }

  /**
   * Desencripta invirtiendo las capas de rotación y XOR con validación de clave.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream',
    secret?: string
  ): Promise<File> {
    const plainBytes = this.decryptToBytes(content, secret);
    return bytesToFile(plainBytes, outputFileName, mimeType);
  }

  /**
   * Desencripta texto directamente.
   */
  public static async decryptText(content: string, secret?: string): Promise<string> {
    const plainBytes = this.decryptToBytes(content, secret);
    return new TextDecoder().decode(plainBytes);
  }

  private static decryptToBytes(content: string, secret?: string): Uint8Array {
    const combined = base64ToBytes(content);
    const headerLength = this.KEY_LENGTH_BYTES + this.MAGIC_CHECKSUM_BYTES;

    if (combined.length < headerLength) {
      throw new Error(`Custom: Contenido inválido, datos demasiado cortos.`);
    }

    const salt = combined.slice(0, this.KEY_LENGTH_BYTES);
    const checksum = combined.slice(this.KEY_LENGTH_BYTES, headerLength);
    const transformed = combined.slice(headerLength);

    const mask = this.deriveSecretMask(secret);
    const expectedChecksum = this.computeChecksum(mask, salt);

    let isMatch = true;
    for (let i = 0; i < this.MAGIC_CHECKSUM_BYTES; i++) {
      if (checksum[i] !== expectedChecksum[i]) {
        isMatch = false;
        break;
      }
    }

    if (!isMatch) {
      throw new Error('Custom: Clave incorrecta o los datos fueron alterados.');
    }

    const effectiveKey = new Uint8Array(this.KEY_LENGTH_BYTES);
    for (let i = 0; i < this.KEY_LENGTH_BYTES; i++) {
      effectiveKey[i] = salt[i] ^ mask[i % mask.length];
    }

    const shift = effectiveKey.reduce((acc, b) => (acc + b) % 256, 0) || 1;

    const plainBytes = new Uint8Array(transformed.length);
    for (let i = 0; i < transformed.length; i++) {
      const unrotated = this.unrotateByte(transformed[i], shift);
      plainBytes[i] = unrotated ^ effectiveKey[i % effectiveKey.length];
    }

    return plainBytes;
  }
}
