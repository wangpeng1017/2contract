/**
 * 基于Web Speech API的语音识别服务
 * 专门优化的Web Speech API实现
 */

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

/**
 * 专门优化的Web Speech API语音识别类
 */
export class WebSpeechRecognition {
  private recognition: SpeechRecognition | null = null;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: string) => void;
  private endCallback?: () => void;
  private startCallback?: () => void;
  private isListening: boolean = false;

  /**
   * 检查浏览器是否支持Web Speech API
   */
  static isSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  /**
   * 获取浏览器支持信息
   */
  static getBrowserSupport(): {
    supported: boolean;
    browser: string;
    version?: string;
  } {
    if (typeof window === 'undefined') {
      return { supported: false, browser: 'server' };
    }

    const userAgent = navigator.userAgent;

    if (window.SpeechRecognition) {
      return {
        supported: true,
        browser: 'chrome',
        version: userAgent.match(/Chrome\/(\d+)/)?.[1]
      };
    } else if (window.webkitSpeechRecognition) {
      return {
        supported: true,
        browser: 'webkit',
        version: userAgent.match(/Version\/(\d+)/)?.[1]
      };
    }

    // 检测具体浏览器
    if (userAgent.includes('Firefox')) {
      return { supported: false, browser: 'firefox' };
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return { supported: false, browser: 'safari' };
    } else if (userAgent.includes('Edge')) {
      return { supported: false, browser: 'edge' };
    }

    return { supported: false, browser: 'unknown' };
  }

  /**
   * 开始语音识别
   */
  async start(options: SpeechRecognitionOptions = {}): Promise<void> {
    if (!WebSpeechRecognition.isSupported()) {
      throw new Error('当前浏览器不支持Web Speech API');
    }

    if (this.isListening) {
      console.warn('[WebSpeechRecognition] 已在监听中，忽略重复启动');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // 优化的识别参数配置
    this.recognition.lang = options.language || 'zh-CN';
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives || 3; // 增加备选项

    // 设置事件监听器
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('[WebSpeechRecognition] 开始语音识别');
      if (this.startCallback) {
        this.startCallback();
      }
    };

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence || 0.8;

      // 过滤掉过短的结果
      if (transcript.length < 1) {
        return;
      }

      console.log(`[WebSpeechRecognition] 识别结果: "${transcript}", 置信度: ${confidence}, 最终: ${result.isFinal}`);

      if (this.resultCallback) {
        this.resultCallback({
          text: transcript,
          confidence,
          isFinal: result.isFinal
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      let errorMessage = '语音识别出错';
      let shouldRetry = false;

      switch (event.error) {
        case 'no-speech':
          errorMessage = '未检测到语音，请重试';
          shouldRetry = true;
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查设备连接';
          break;
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
          break;
        case 'network':
          errorMessage = '网络连接错误，请检查网络状态';
          shouldRetry = true;
          break;
        case 'service-not-allowed':
          errorMessage = '语音识别服务不可用';
          break;
        case 'bad-grammar':
          errorMessage = '语法识别错误';
          shouldRetry = true;
          break;
        case 'language-not-supported':
          errorMessage = '不支持当前语言设置';
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
          shouldRetry = true;
      }

      console.error(`[WebSpeechRecognition] 错误: ${event.error} - ${errorMessage}`);

      if (this.errorCallback) {
        this.errorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('[WebSpeechRecognition] 语音识别结束');
      if (this.endCallback) {
        this.endCallback();
      }
    };

    // 开始识别
    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      throw new Error(`启动语音识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 停止语音识别
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      console.log('[WebSpeechRecognition] 手动停止语音识别');
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * 强制中止语音识别
   */
  abort(): void {
    if (this.recognition && this.isListening) {
      console.log('[WebSpeechRecognition] 强制中止语音识别');
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * 检查是否正在监听
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * 设置开始回调
   */
  onStart(callback: () => void): void {
    this.startCallback = callback;
  }

  /**
   * 设置结果回调
   */
  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  /**
   * 设置错误回调
   */
  onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  /**
   * 设置结束回调
   */
  onEnd(callback: () => void): void {
    this.endCallback = callback;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stop();
    this.recognition = null;
    this.resultCallback = undefined;
    this.errorCallback = undefined;
    this.endCallback = undefined;
    this.startCallback = undefined;
  }
}



/**
 * Web Speech API 语音识别工具函数
 */
export class SpeechRecognitionUtils {
  /**
   * 获取推荐的语音识别配置
   */
  static getRecommendedConfig(): SpeechRecognitionOptions {
    return {
      language: 'zh-CN',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3
    };
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'zh-CN', name: '中文（普通话）' },
      { code: 'zh-TW', name: '中文（台湾）' },
      { code: 'zh-HK', name: '中文（香港）' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' }
    ];
  }

  /**
   * 检测用户的首选语言
   */
  static detectPreferredLanguage(): string {
    const browserLang = navigator.language || 'zh-CN';
    const supportedCodes = this.getSupportedLanguages().map(lang => lang.code);

    // 精确匹配
    if (supportedCodes.includes(browserLang)) {
      return browserLang;
    }

    // 语言前缀匹配
    const langPrefix = browserLang.split('-')[0];
    const prefixMatch = supportedCodes.find(code => code.startsWith(langPrefix));

    return prefixMatch || 'zh-CN';
  }

  /**
   * 格式化识别结果文本
   */
  static formatRecognitionText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/[。，！？；：]/g, match => match + ' ') // 中文标点后加空格
      .trim();
  }

  /**
   * 评估识别结果质量
   */
  static evaluateResultQuality(result: SpeechRecognitionResult): {
    quality: 'high' | 'medium' | 'low';
    score: number;
    suggestions: string[];
  } {
    const { text, confidence } = result;
    const suggestions: string[] = [];
    let score = confidence;

    // 长度评估
    if (text.length < 2) {
      score -= 0.3;
      suggestions.push('识别文本过短，建议重新录音');
    } else if (text.length > 100) {
      score -= 0.1;
      suggestions.push('识别文本较长，建议分段录音');
    }

    // 置信度评估
    if (confidence < 0.6) {
      suggestions.push('识别置信度较低，建议在安静环境中重试');
    }

    // 质量等级
    let quality: 'high' | 'medium' | 'low';
    if (score >= 0.8) {
      quality = 'high';
    } else if (score >= 0.6) {
      quality = 'medium';
    } else {
      quality = 'low';
      suggestions.push('建议检查麦克风设备或网络连接');
    }

    return { quality, score, suggestions };
  }
}

// 扩展Window接口以支持Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
}
