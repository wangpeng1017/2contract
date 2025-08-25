import CryptoJS from 'crypto-js';

/**
 * 加密工具类
 */
export class EncryptionService {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.ENCRYPTION_KEY || 'default-secret-key';
    
    if (this.secretKey === 'default-secret-key') {
      console.warn('Warning: Using default encryption key. Please set ENCRYPTION_KEY environment variable.');
    }
  }

  /**
   * 加密文本
   */
  encrypt(text: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 解密文本
   */
  decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 加密对象
   */
  encryptObject(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Object encryption error:', error);
      throw new Error('Failed to encrypt object');
    }
  }

  /**
   * 解密对象
   */
  decryptObject<T = any>(encryptedText: string): T {
    try {
      const decryptedString = this.decrypt(encryptedText);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Object decryption error:', error);
      throw new Error('Failed to decrypt object');
    }
  }

  /**
   * 生成哈希
   */
  hash(text: string): string {
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * 验证哈希
   */
  verifyHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }

  /**
   * 生成随机盐值
   */
  generateSalt(length: number = 16): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * 带盐值的哈希
   */
  hashWithSalt(text: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || this.generateSalt();
    const hash = CryptoJS.SHA256(text + usedSalt).toString();
    return { hash, salt: usedSalt };
  }

  /**
   * 验证带盐值的哈希
   */
  verifyHashWithSalt(text: string, hash: string, salt: string): boolean {
    const computed = CryptoJS.SHA256(text + salt).toString();
    return computed === hash;
  }
}

/**
 * 默认加密服务实例
 */
export const encryptionService = new EncryptionService();
