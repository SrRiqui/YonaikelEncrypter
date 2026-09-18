import type { CryptoAlgorithmId } from '../../types/crypto.types';
import { Base64CryptoService } from './base64.service';
import { AesCryptoService } from './aes.service';
import { CustomLayerCryptoService } from './custom.service';

export * from './base64.service';
export * from './aes.service';
export * from './custom.service';

/**
 * Fachada unificada que ejecuta el algoritmo adecuado según el ID seleccionado.
 */
export class CryptoEngine {
  public static async encrypt(file: File, algorithm: CryptoAlgorithmId): Promise<string> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.encrypt(file);
      case 'aes':
        return AesCryptoService.encrypt(file);
      case 'custom':
        return CustomLayerCryptoService.encrypt(file);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }

  public static async decrypt(
    content: string,
    algorithm: CryptoAlgorithmId,
    outputFileName: string
  ): Promise<File> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.decrypt(content, outputFileName);
      case 'aes':
        return AesCryptoService.decrypt(content, outputFileName);
      case 'custom':
        return CustomLayerCryptoService.decrypt(content, outputFileName);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }
}
