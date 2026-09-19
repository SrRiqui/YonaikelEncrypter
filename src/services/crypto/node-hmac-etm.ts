import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

/**
 * Servicio de Cifrado y Autenticación HMAC bajo el estándar Encrypt-then-MAC (EtM).
 * Implementado exclusivamente utilizando el módulo nativo 'node:crypto' de Node.js.
 * 
 * Reglas estrictas aplicadas:
 * 1. Módulo nativo node:crypto sin dependencias externas.
 * 2. Derivación de dos claves independientes de 32 bytes (K_enc y K_mac) con PBKDF2/HKDF SHA-256.
 * 3. Cálculo de HMAC-SHA256 sobre Buffer.concat([iv, ciphertext]).
 * 4. Payload consolidado: [IV (16B)] + [Ciphertext (NB)] + [HMAC Tag (32B)].
 * 5. Validación obligatoria previa al descifrado con crypto.timingSafeEqual.
 * 6. Descifrado únicamente tras superar la validación.
 * 7. Soporte para Buffer, Base64 y Hex.
 */
export class NodeHmacEtmService {
  private static readonly IV_LENGTH_BYTES = 16;
  private static readonly HMAC_TAG_LENGTH_BYTES = 32;
  private static readonly KEY_LENGTH_BYTES = 32;
  private static readonly PBKDF2_SALT = Buffer.from('YonaikelEtMSalt2026', 'utf-8');
  private static readonly PBKDF2_ITERATIONS = 10000;

  /**
   * Deriva dos claves independientes de 32 bytes ($K_{enc}$ y $K_{mac}$)
   * desde el secreto maestro o contraseña usando PBKDF2 con SHA-256.
   */
  public static deriveKeys(secret: string | Buffer): { kEnc: Buffer; kMac: Buffer } {
    const masterSecret = typeof secret === 'string' ? Buffer.from(secret, 'utf-8') : secret;
    // Derivar 64 bytes: 32 para K_enc y 32 para K_mac
    const derived = crypto.pbkdf2Sync(
      masterSecret,
      this.PBKDF2_SALT,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH_BYTES * 2,
      'sha256'
    );

    const kEnc = derived.subarray(0, this.KEY_LENGTH_BYTES);
    const kMac = derived.subarray(this.KEY_LENGTH_BYTES, this.KEY_LENGTH_BYTES * 2);

    return { kEnc, kMac };
  }

  /**
   * Cifra datos en claro utilizando AES-256-CBC y calcula el HMAC-SHA256 bajo Encrypt-then-MAC (EtM).
   * Retorna un Buffer con estructura: [IV (16 bytes)] + [Ciphertext (N bytes)] + [HMAC Tag (32 bytes)].
   */
  public static encrypt(
    plaintext: Buffer | string,
    secret: string | Buffer,
    encoding?: 'base64' | 'hex'
  ): Buffer | string {
    const plainBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
    const { kEnc, kMac } = this.deriveKeys(secret);

    // Generar vector de inicialización aleatorio de 16 bytes
    const iv = crypto.randomBytes(this.IV_LENGTH_BYTES);

    // Cifrar datos con AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', kEnc, iv);
    const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);

    // Calcular HMAC sobre la concatenación de IV y Ciphertext: HMAC(Buffer.concat([iv, ciphertext]))
    const ivAndCiphertext = Buffer.concat([iv, ciphertext]);
    const hmac = crypto.createHmac('sha256', kMac);
    hmac.update(ivAndCiphertext);
    const hmacTag = hmac.digest(); // 32 bytes

    // Estructura del payload final: [IV (16)] + [Ciphertext (N)] + [HMAC Tag (32)]
    const finalPayload = Buffer.concat([iv, ciphertext, hmacTag]);

    if (encoding === 'base64') {
      return finalPayload.toString('base64');
    }
    if (encoding === 'hex') {
      return finalPayload.toString('hex');
    }
    return finalPayload;
  }

  /**
   * Valida la autenticidad e integridad mediante timingSafeEqual y, tras superarla,
   * descifra el contenido.
   * Lanza un error genérico y cancela de inmediato si los datos fueron alterados.
   */
  public static decrypt(
    encryptedData: Buffer | string,
    secret: string | Buffer,
    inputEncoding?: 'base64' | 'hex'
  ): Buffer {
    let payloadBuffer: Buffer;
    if (typeof encryptedData === 'string') {
      const enc = inputEncoding || (this.isHex(encryptedData) ? 'hex' : 'base64');
      payloadBuffer = Buffer.from(encryptedData, enc);
    } else {
      payloadBuffer = encryptedData;
    }

    const minLength = this.IV_LENGTH_BYTES + this.HMAC_TAG_LENGTH_BYTES + 1;
    if (payloadBuffer.length < minLength) {
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }

    const { kEnc, kMac } = this.deriveKeys(secret);

    // Extraer componentes
    const iv = payloadBuffer.subarray(0, this.IV_LENGTH_BYTES);
    const receivedTag = payloadBuffer.subarray(payloadBuffer.length - this.HMAC_TAG_LENGTH_BYTES);
    const ciphertext = payloadBuffer.subarray(this.IV_LENGTH_BYTES, payloadBuffer.length - this.HMAC_TAG_LENGTH_BYTES);

    // Recalcular localmente el HMAC sobre Buffer.concat([iv, ciphertext])
    const ivAndCiphertext = Buffer.concat([iv, ciphertext]);
    const hmac = crypto.createHmac('sha256', kMac);
    hmac.update(ivAndCiphertext);
    const calculatedTag = hmac.digest();

    // Comparar obligatoriamente utilizando crypto.timingSafeEqual
    if (receivedTag.length !== calculatedTag.length || !crypto.timingSafeEqual(receivedTag, calculatedTag)) {
      // Interrumpir la ejecución de inmediato sin ejecutar crypto.createDecipheriv
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }

    // Descifrar únicamente tras haber superado la validación de timingSafeEqual
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', kEnc, iv);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }
  }

  /**
   * Helper para descifrar y retornar directamente como string UTF-8.
   */
  public static decryptText(
    encryptedData: Buffer | string,
    secret: string | Buffer,
    inputEncoding?: 'base64' | 'hex'
  ): string {
    const decryptedBuffer = this.decrypt(encryptedData, secret, inputEncoding);
    return decryptedBuffer.toString('utf-8');
  }

  private static isHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
  }
}
