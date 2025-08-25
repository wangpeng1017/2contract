import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

// 在构建时允许缺少加密密钥
if (!ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
  throw new Error('ENCRYPTION_KEY environment variable is required')
} else if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  console.warn('⚠️ ENCRYPTION_KEY未配置，构建时使用默认密钥')
}

/**
 * 加密文本
 */
export function encrypt(text: string): string {
  try {
    // 运行时检查加密密钥
    if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required for encryption in production');
    }

    const key = ENCRYPTION_KEY || 'default-encryption-key-for-development';
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
    return encrypted
  } catch (error) {
    console.error('加密失败:', error)
    throw new Error('加密失败')
  }
}

/**
 * 解密文本
 */
export function decrypt(encryptedText: string): string {
  try {
    // 运行时检查加密密钥
    if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required for decryption in production');
    }

    const key = ENCRYPTION_KEY || 'default-encryption-key-for-development';
    const bytes = CryptoJS.AES.decrypt(encryptedText, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)

    if (!decrypted) {
      throw new Error('解密结果为空')
    }

    return decrypted
  } catch (error) {
    console.error('解密失败:', error)
    throw new Error('解密失败')
  }
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length / 2).toString()
}

/**
 * 生成哈希值
 */
export function generateHash(text: string): string {
  return CryptoJS.SHA256(text).toString()
}

/**
 * 验证哈希值
 */
export function verifyHash(text: string, hash: string): boolean {
  return generateHash(text) === hash
}

/**
 * 加密敏感数据对象
 */
export function encryptObject(obj: any): string {
  try {
    const jsonString = JSON.stringify(obj)
    return encrypt(jsonString)
  } catch (error) {
    console.error('对象加密失败:', error)
    throw new Error('对象加密失败')
  }
}

/**
 * 解密敏感数据对象
 */
export function decryptObject<T = any>(encryptedText: string): T {
  try {
    const decryptedString = decrypt(encryptedText)
    return JSON.parse(decryptedString)
  } catch (error) {
    console.error('对象解密失败:', error)
    throw new Error('对象解密失败')
  }
}
