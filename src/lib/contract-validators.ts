/**
 * 合同字段验证器
 * 用于验证从OCR提取的合同信息的格式和有效性
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedValue?: any;
}

/**
 * 电话号码验证器
 */
export class PhoneValidator {
  private static readonly PHONE_PATTERNS = [
    /^1[3-9]\d{9}$/,           // 中国手机号
    /^0\d{2,3}-?\d{7,8}$/,     // 中国固定电话
    /^\+86-?1[3-9]\d{9}$/,     // 带国际区号的中国手机号
    /^\d{3}-\d{3}-\d{4}$/,     // 美国电话格式
    /^\d{10,15}$/              // 通用数字格式
  ];

  static validate(phone: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    if (!phone || typeof phone !== 'string') {
      result.errors.push('电话号码不能为空');
      return result;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    for (const pattern of this.PHONE_PATTERNS) {
      if (pattern.test(cleanPhone)) {
        result.isValid = true;
        result.normalizedValue = this.formatPhone(cleanPhone);
        break;
      }
    }

    if (!result.isValid) {
      result.errors.push('电话号码格式不正确');
    }

    return result;
  }

  private static formatPhone(phone: string): string {
    // 中国手机号格式化
    if (/^1[3-9]\d{9}$/.test(phone)) {
      return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    // 中国固定电话格式化
    if (/^0\d{2,3}\d{7,8}$/.test(phone)) {
      if (phone.length === 11) {
        return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
      } else if (phone.length === 12) {
        return phone.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
      }
    }

    return phone;
  }
}

/**
 * 金额验证器
 */
export class AmountValidator {
  private static readonly AMOUNT_PATTERNS = [
    /^¥?[\d,]+\.?\d*$/,                    // 人民币格式
    /^￥[\d,]+\.?\d*$/,                    // 人民币格式（全角）
    /^\$[\d,]+\.?\d*$/,                    // 美元格式
    /^[\d,]+\.?\d*元?$/,                   // 数字+元
    /^[\d,]+\.?\d*万?元?$/,                // 数字+万元
    /^[\d,]+\.?\d*千?元?$/,                // 数字+千元
    /^[\d,]+\.?\d*亿?元?$/                 // 数字+亿元
  ];

  static validate(amount: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    if (!amount || typeof amount !== 'string') {
      result.errors.push('金额不能为空');
      return result;
    }

    const cleanAmount = amount.trim();
    
    for (const pattern of this.AMOUNT_PATTERNS) {
      if (pattern.test(cleanAmount)) {
        result.isValid = true;
        result.normalizedValue = this.normalizeAmount(cleanAmount);
        break;
      }
    }

    if (!result.isValid) {
      result.errors.push('金额格式不正确');
    }

    // 检查金额是否合理
    if (result.isValid && result.normalizedValue) {
      const numericValue = this.extractNumericValue(result.normalizedValue);
      if (numericValue <= 0) {
        result.warnings.push('金额应该大于0');
      }
      if (numericValue > 10000000) { // 1000万
        result.warnings.push('金额较大，请确认是否正确');
      }
    }

    return result;
  }

  private static normalizeAmount(amount: string): string {
    // 移除多余的符号和空格
    let normalized = amount.replace(/[¥￥\$]/g, '').trim();
    
    // 确保有货币单位
    if (!normalized.includes('元') && !normalized.includes('$')) {
      normalized += '元';
    }

    return normalized;
  }

  private static extractNumericValue(amount: string): number {
    const match = amount.match(/[\d,]+\.?\d*/);
    if (match) {
      const numStr = match[0].replace(/,/g, '');
      let value = parseFloat(numStr);
      
      // 处理单位
      if (amount.includes('万')) {
        value *= 10000;
      } else if (amount.includes('千')) {
        value *= 1000;
      } else if (amount.includes('亿')) {
        value *= 100000000;
      }
      
      return value;
    }
    return 0;
  }
}

/**
 * 车架号验证器
 */
export class VINValidator {
  private static readonly VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

  static validate(vin: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    if (!vin || typeof vin !== 'string') {
      result.errors.push('车架号不能为空');
      return result;
    }

    const cleanVIN = vin.trim().toUpperCase();
    
    if (cleanVIN.length !== 17) {
      result.errors.push('车架号长度必须为17位');
      return result;
    }

    if (!this.VIN_PATTERN.test(cleanVIN)) {
      result.errors.push('车架号格式不正确（不能包含I、O、Q字母）');
      return result;
    }

    result.isValid = true;
    result.normalizedValue = cleanVIN;

    return result;
  }

  static validateMultiple(vins: string[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      normalizedValue: []
    };

    if (!Array.isArray(vins) || vins.length === 0) {
      result.errors.push('车架号列表不能为空');
      result.isValid = false;
      return result;
    }

    const validVINs: string[] = [];
    const duplicates = new Set<string>();

    for (let i = 0; i < vins.length; i++) {
      const vinResult = this.validate(vins[i]);
      
      if (vinResult.isValid && vinResult.normalizedValue) {
        if (validVINs.includes(vinResult.normalizedValue)) {
          duplicates.add(vinResult.normalizedValue);
          result.warnings.push(`车架号重复: ${vinResult.normalizedValue}`);
        } else {
          validVINs.push(vinResult.normalizedValue);
        }
      } else {
        result.errors.push(`第${i + 1}个车架号无效: ${vinResult.errors.join(', ')}`);
        result.isValid = false;
      }
    }

    result.normalizedValue = validVINs;
    return result;
  }
}

/**
 * 邮编验证器
 */
export class PostalCodeValidator {
  private static readonly POSTAL_PATTERNS = [
    /^\d{6}$/,                 // 中国邮编
    /^\d{5}(-\d{4})?$/,        // 美国邮编
    /^[A-Z]\d[A-Z] \d[A-Z]\d$/ // 加拿大邮编
  ];

  static validate(postalCode: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    if (!postalCode || typeof postalCode !== 'string') {
      result.errors.push('邮编不能为空');
      return result;
    }

    const cleanCode = postalCode.trim().toUpperCase();
    
    for (const pattern of this.POSTAL_PATTERNS) {
      if (pattern.test(cleanCode)) {
        result.isValid = true;
        result.normalizedValue = cleanCode;
        break;
      }
    }

    if (!result.isValid) {
      result.errors.push('邮编格式不正确');
    }

    return result;
  }
}

/**
 * 综合合同信息验证器
 */
export class ContractValidator {
  static validateContractInfo(contractInfo: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 验证甲方信息
    if (contractInfo.parties?.partyA?.contact?.phone) {
      const phoneResult = PhoneValidator.validate(contractInfo.parties.partyA.contact.phone);
      if (!phoneResult.isValid) {
        result.errors.push(`甲方电话号码: ${phoneResult.errors.join(', ')}`);
        result.isValid = false;
      }
      result.warnings.push(...phoneResult.warnings);
    }

    // 验证乙方信息
    if (contractInfo.parties?.partyB?.contact?.phone) {
      const phoneResult = PhoneValidator.validate(contractInfo.parties.partyB.contact.phone);
      if (!phoneResult.isValid) {
        result.errors.push(`乙方电话号码: ${phoneResult.errors.join(', ')}`);
        result.isValid = false;
      }
      result.warnings.push(...phoneResult.warnings);
    }

    // 验证金额信息
    if (contractInfo.priceDetails?.totalAmount) {
      const amountResult = AmountValidator.validate(contractInfo.priceDetails.totalAmount);
      if (!amountResult.isValid) {
        result.errors.push(`合同总金额: ${amountResult.errors.join(', ')}`);
        result.isValid = false;
      }
      result.warnings.push(...amountResult.warnings);
    }

    // 验证车架号
    if (contractInfo.vehicles && Array.isArray(contractInfo.vehicles)) {
      for (const vehicle of contractInfo.vehicles) {
        if (vehicle.vinNumbers && Array.isArray(vehicle.vinNumbers)) {
          const vinResult = VINValidator.validateMultiple(vehicle.vinNumbers);
          if (!vinResult.isValid) {
            result.errors.push(`车架号验证失败: ${vinResult.errors.join(', ')}`);
            result.isValid = false;
          }
          result.warnings.push(...vinResult.warnings);
        }
      }
    }

    return result;
  }
}
