import { readFileAsBytes, bytesToBase64, base64ToBytes, bytesToFile } from '../../utils/file.utils';

/**
 * Implementación web de Encrypt-then-MAC (EtM) con HMAC-SHA256 compatible 100%
 * con el estándar de node:crypto (NodeHmacEtmService).
 * 
 * Estructura del payload consolidado:
 * [IV (16 bytes)] + [Ciphertext (N bytes)] + [HMAC Tag (32 bytes)]
 */
export class EtmCryptoService {
  private static readonly IV_LENGTH_BYTES = 16;
  private static readonly HMAC_TAG_LENGTH_BYTES = 32;
  private static readonly PBKDF2_SALT = new TextEncoder().encode('YonaikelEtMSalt2026');
  private static readonly PBKDF2_ITERATIONS = 10000;
  public static readonly DEFAULT_SECRET = 'VaultEncrypterSecretKey2026';

  /**
   * Deriva dos claves independientes de 32 bytes (K_enc para AES-CBC y K_mac para HMAC-SHA256).
   */
  private static async deriveKeys(secret: string = this.DEFAULT_SECRET): Promise<{ encKey: CryptoKey; macKey: CryptoKey }> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derivar 64 bytes (512 bits): 32 bytes para K_enc y 32 bytes para K_mac
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: this.PBKDF2_SALT,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      512
    );

    const kEncBytes = derivedBits.slice(0, 32);
    const kMacBytes = derivedBits.slice(32, 64);

    const encKey = await crypto.subtle.importKey(
      'raw',
      kEncBytes,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const macKey = await crypto.subtle.importKey(
      'raw',
      kMacBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    return { encKey, macKey };
  }

  /**
   * Comparación de tiempo constante (timing-safe) para evitar ataques de canal lateral.
   */
  public static timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }

  /**
   * Cifra un archivo utilizando AES-256-CBC y HMAC-SHA256 bajo Encrypt-then-MAC (EtM).
   * Retorna una cadena Base64 con el payload: [IV (16)] + [Ciphertext (N)] + [HMAC Tag (32)].
   */
  public static async encrypt(file: File, secret: string = this.DEFAULT_SECRET): Promise<string> {
    const plainBytes = await readFileAsBytes(file);
    return this.encryptBytes(plainBytes, secret);
  }

  /**
   * Cifra texto plano utilizando AES-256-CBC y HMAC-SHA256 (EtM).
   */
  public static async encryptText(text: string, secret: string = this.DEFAULT_SECRET): Promise<string> {
    const plainBytes = new TextEncoder().encode(text);
    return this.encryptBytes(plainBytes, secret);
  }

  /**
   * Ejecuta el flujo EtM:
   * 1. Cifrar con AES-256-CBC.
   * 2. HMAC-SHA256 sobre [IV + Ciphertext].
   * 3. Consolidar: [IV] + [Ciphertext] + [HMAC Tag].
   */
  private static async encryptBytes(plainBytes: Uint8Array, secret: string): Promise<string> {
    const { encKey, macKey } = await this.deriveKeys(secret);
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH_BYTES));

    // 1. Cifrado AES-CBC
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      encKey,
      plainBytes as BufferSource
    );
    const ciphertext = new Uint8Array(cipherBuffer);

    // 2. Concatenar IV + Ciphertext para el cálculo del HMAC
    const ivAndCiphertext = new Uint8Array(iv.length + ciphertext.length);
    ivAndCiphertext.set(iv, 0);
    ivAndCiphertext.set(ciphertext, iv.length);

    // 3. Calcular HMAC(ivAndCiphertext)
    const tagBuffer = await crypto.subtle.sign('HMAC', macKey, ivAndCiphertext);
    const hmacTag = new Uint8Array(tagBuffer); // 32 bytes

    // 4. Consolidar payload final: [IV (16)] + [Ciphertext (N)] + [HMAC Tag (32)]
    const finalPayload = new Uint8Array(iv.length + ciphertext.length + hmacTag.length);
    finalPayload.set(iv, 0);
    finalPayload.set(ciphertext, iv.length);
    finalPayload.set(hmacTag, iv.length + ciphertext.length);

    return bytesToBase64(finalPayload);
  }

  /**
   * Desencripta un payload EtM validando estrictamente el HMAC antes de invocar el descifrador.
   */
  public static async decrypt(
    content: string,
    outputFileName: string = 'decrypted_file',
    mimeType: string = 'application/octet-stream',
    secret: string = this.DEFAULT_SECRET
  ): Promise<File> {
    const decryptedBytes = await this.decryptToBytes(content, secret);
    return bytesToFile(decryptedBytes, outputFileName, mimeType);
  }

  /**
   * Desencripta un payload EtM a texto plano tras superar la verificación de integridad.
   */
  public static async decryptText(content: string, secret: string = this.DEFAULT_SECRET): Promise<string> {
    const decryptedBytes = await this.decryptToBytes(content, secret);
    return new TextDecoder().decode(decryptedBytes);
  }

  /**
   * Flujo de verificación y descifrado seguro:
   * 1. Extraer IV, Ciphertext y HMAC Tag recibido.
   * 2. Recalcular localmente el HMAC sobre [IV + Ciphertext].
   * 3. Comparar con timingSafeEqual.
   * 4. Si falla o longitudes difieren: lanzar 'Error de autenticación: datos corruptos o manipulados' de inmediato.
   * 5. Descifrar únicamente si superó la validación.
   */
  public static async decryptToBytes(content: string, secret: string): Promise<Uint8Array> {
    const combined = base64ToBytes(content);
    const minLength = this.IV_LENGTH_BYTES + this.HMAC_TAG_LENGTH_BYTES + 1;
    if (combined.length < minLength) {
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }

    const { encKey, macKey } = await this.deriveKeys(secret);

    // Extraer componentes
    const iv = combined.slice(0, this.IV_LENGTH_BYTES);
    const receivedTag = combined.slice(combined.length - this.HMAC_TAG_LENGTH_BYTES);
    const ciphertext = combined.slice(this.IV_LENGTH_BYTES, combined.length - this.HMAC_TAG_LENGTH_BYTES);

    // Concatenar [IV + Ciphertext]
    const ivAndCiphertext = new Uint8Array(iv.length + ciphertext.length);
    ivAndCiphertext.set(iv, 0);
    ivAndCiphertext.set(ciphertext, iv.length);

    // Recalcular HMAC
    const calculatedTagBuffer = await crypto.subtle.sign('HMAC', macKey, ivAndCiphertext);
    const calculatedTag = new Uint8Array(calculatedTagBuffer);

    // Comparar con igualdad de tiempo constante
    if (!this.timingSafeEqual(receivedTag, calculatedTag)) {
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }

    // Descifrar únicamente tras haber superado la validación
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        encKey,
        ciphertext
      );
      return new Uint8Array(decryptedBuffer);
    } catch {
      throw new Error('Error de autenticación: datos corruptos o manipulados');
    }
  }

  /**
   * Comprueba si una cadena cifrada tiene la firma y estructura válida de un payload EtM con la clave dada.
   */
  public static async verifyPayload(content: string, secret: string): Promise<boolean> {
    try {
      const combined = base64ToBytes(content);
      const minLength = this.IV_LENGTH_BYTES + this.HMAC_TAG_LENGTH_BYTES + 1;
      if (combined.length < minLength) return false;

      const { macKey } = await this.deriveKeys(secret);
      const iv = combined.slice(0, this.IV_LENGTH_BYTES);
      const receivedTag = combined.slice(combined.length - this.HMAC_TAG_LENGTH_BYTES);
      const ciphertext = combined.slice(this.IV_LENGTH_BYTES, combined.length - this.HMAC_TAG_LENGTH_BYTES);

      const ivAndCiphertext = new Uint8Array(iv.length + ciphertext.length);
      ivAndCiphertext.set(iv, 0);
      ivAndCiphertext.set(ciphertext, iv.length);

      const calculatedTag = new Uint8Array(await crypto.subtle.sign('HMAC', macKey, ivAndCiphertext));
      return this.timingSafeEqual(receivedTag, calculatedTag);
    } catch {
      return false;
    }
  }
}
