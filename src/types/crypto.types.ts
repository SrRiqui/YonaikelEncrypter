/**
 * Definiciones de tipos e interfaces para el sistema criptográfico de YonaikelEncrypter.
 */

export type CryptoAlgorithmId = 'base64' | 'aes' | 'custom';

export type NavigationTab = 'main' | 'encrypt' | 'decrypt';

export type InputMode = 'file' | 'text';

export type KeyLength = 6 | 12;

export type QueueItemStatus = 'queued' | 'processing' | 'completed' | 'error';

export interface MethodOption {
  id: CryptoAlgorithmId;
  title: string;
  description: string;
  tag: string;
}

export interface QueuedFile {
  id: string;
  file: File;
  algorithm: CryptoAlgorithmId;
  status: QueueItemStatus;
  progress: number;
  error?: string;
}

export interface EncryptedFileItem {
  id: string;
  name: string;
  size: number;
  algorithm: CryptoAlgorithmId;
  date: string;
  downloadUrl: string;
}

export interface DecryptedFileItem {
  id: string;
  name: string;
  size: number;
  algorithm: CryptoAlgorithmId;
  date: string;
  downloadUrl: string;
}
