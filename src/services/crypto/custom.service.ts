import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

export class CustomLayerCryptoService {
  private static readonly KEY_LENGTH_BYTES = 16;

  private static rotateByte(byte: number, shift: number): number {
    return (byte + shift) % 256;
  }

  private static unrotateByte(byte: number, shift: number): number {
    return (byte - shift + 256) % 256;
  }

  /**
   * Encripta un archivo con algoritmo por capas:
   * Genera clave de 16 bytes, aplica XOR y rotación pseudo-César simétrica.
   */
  public static async encrypt(file: File): Promise<string> {
    const plainBytes = await readFileAsBytes(file);
    const key = crypto.getRandomValues(new Uint8Array(this.KEY_LENGTH_BYTES));
    const shift = key.reduce((acc, b) => (acc + b) % 256, 0) || 1;

    const transformed = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      const xored = plainBytes[i] ^ key[i % key.length];
      transformed[i] = this.rotateByte(xored, shift);
    }

    const combined = new Uint8Array(key.length + transformed.length);
    combined.set(key, 0);
    combined.set(transformed, key.length);

    return bytesToBase64(combined);
  }

  /**
   * Desencripta invirtiendo las capas de rotación y XOR con la clave extraída.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream'
  ): Promise<File> {
    const combined = base64ToBytes(content);
    if (combined.length < this.KEY_LENGTH_BYTES) {
      throw new Error(`Custom: Contenido inválido, se requieren al menos ${this.KEY_LENGTH_BYTES} bytes de clave.`);
    }

    const key = combined.slice(0, this.KEY_LENGTH_BYTES);
    const transformed = combined.slice(this.KEY_LENGTH_BYTES);
    const shift = key.reduce((acc, b) => (acc + b) % 256, 0) || 1;

    const plainBytes = new Uint8Array(transformed.length);
    for (let i = 0; i < transformed.length; i++) {
      const unrotated = this.unrotateByte(transformed[i], shift);
      plainBytes[i] = unrotated ^ key[i % key.length];
    }

    return bytesToFile(plainBytes, outputFileName, mimeType);
  }
}
