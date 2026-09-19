import type { CryptoAlgorithmId } from '../../types/crypto.types';
import { Base64CryptoService } from './base64.service';
import { AesCryptoService } from './aes.service';
import { CustomLayerCryptoService } from './custom.service';

import { EtmCryptoService } from './etm.service';

export * from './base64.service';
export * from './aes.service';
export * from './custom.service';
export * from './etm.service';

/**
 * Fachada unificada que ejecuta el algoritmo adecuado según el ID seleccionado,
 * con soporte para archivos o texto plano y claves de seguridad.
 */
export class CryptoEngine {
  /**
   * Encripta un archivo utilizando el algoritmo y la clave especificados.
   */
  public static async encrypt(file: File, algorithm: CryptoAlgorithmId, secret?: string): Promise<string> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.encrypt(file, secret);
      case 'aes':
        return AesCryptoService.encrypt(file, secret);
      case 'custom':
        return CustomLayerCryptoService.encrypt(file, secret);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }

  /**
   * Desencripta una cadena cifrada y reconstruye el archivo original.
   */
  public static async decrypt(
    content: string,
    algorithm: CryptoAlgorithmId,
    outputFileName: string,
    secret?: string
  ): Promise<File> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.decrypt(content, outputFileName, 'application/octet-stream', secret);
      case 'aes':
        return AesCryptoService.decrypt(content, outputFileName, 'application/octet-stream', secret);
      case 'custom':
        return CustomLayerCryptoService.decrypt(content, outputFileName, 'application/octet-stream', secret);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }

  /**
   * Encripta texto plano directamente y retorna una cadena cifrada.
   */
  public static async encryptText(
    text: string,
    algorithm: CryptoAlgorithmId,
    secret?: string
  ): Promise<string> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.encryptText(text, secret);
      case 'aes':
        return AesCryptoService.encryptText(text, secret);
      case 'custom':
        return CustomLayerCryptoService.encryptText(text, secret);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }

  /**
   * Desencripta una cadena cifrada y retorna el texto en claro.
   */
  public static async decryptText(
    content: string,
    algorithm: CryptoAlgorithmId,
    secret?: string
  ): Promise<string> {
    switch (algorithm) {
      case 'base64':
        return Base64CryptoService.decryptText(content, secret);
      case 'aes':
        return AesCryptoService.decryptText(content, secret);
      case 'custom':
        return CustomLayerCryptoService.decryptText(content, secret);
      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }
  }

  /**
   * Encripta un archivo utilizando el estándar Encrypt-then-MAC (AES-256-CBC + HMAC-SHA256).
   */
  public static async encryptEtm(file: File, secret?: string): Promise<string> {
    return EtmCryptoService.encrypt(file, secret);
  }

  /**
   * Desencripta un archivo validando previamente el HMAC con timingSafeEqual.
   */
  public static async decryptEtm(
    content: string,
    outputFileName: string,
    secret?: string
  ): Promise<File> {
    return EtmCryptoService.decrypt(content, outputFileName, 'application/octet-stream', secret);
  }

  /**
   * Encripta texto directamente con HMAC Encrypt-then-MAC.
   */
  public static async encryptEtmText(text: string, secret?: string): Promise<string> {
    return EtmCryptoService.encryptText(text, secret);
  }

  /**
   * Desencripta texto validando previamente el HMAC con timingSafeEqual.
   */
  public static async decryptEtmText(content: string, secret?: string): Promise<string> {
    return EtmCryptoService.decryptText(content, secret);
  }

  /**
   * Valida si un payload cifrado cumple con el HMAC y clave especificados sin descifrar.
   */
  public static async verifyEtm(content: string, secret?: string): Promise<boolean> {
    return EtmCryptoService.verifyPayload(content, secret || EtmCryptoService.DEFAULT_SECRET);
  }
}
