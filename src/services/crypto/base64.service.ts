import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

export class Base64CryptoService {
  /**
   * Codifica un archivo en una cadena Base64.
   */
  public static async encrypt(file: File): Promise<string> {
    const bytes = await readFileAsBytes(file);
    return bytesToBase64(bytes);
  }

  /**
   * Decodifica una cadena Base64 y reconstruye el archivo original.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream'
  ): Promise<File> {
    const bytes = base64ToBytes(content);
    return bytesToFile(bytes, outputFileName, mimeType);
  }
}
