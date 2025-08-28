/**
 * 语音识别服务
 * 支持Web Speech API和百度语音API的混合方案
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

export interface SpeechRecognitionProvider {
  isSupported(): boolean;
  start(options?: SpeechRecognitionOptions): Promise<void>;
  stop(): void;
  onResult(callback: (result: SpeechRecognitionResult) => void): void;
  onError(callback: (error: string) => void): void;
  onEnd(callback: () => void): void;
}

/**
 * Web Speech API 实现
 */
class WebSpeechProvider implements SpeechRecognitionProvider {
  private recognition: SpeechRecognition | null = null;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: string) => void;
  private endCallback?: () => void;

  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async start(options: SpeechRecognitionOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API not supported');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // 配置识别参数
    this.recognition.lang = options.language || 'zh-CN';
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    // 设置事件监听器
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0.8;

      if (this.resultCallback) {
        this.resultCallback({
          text: transcript,
          confidence,
          isFinal: result.isFinal
        });
      }
    };

    this.recognition.onerror = (event) => {
      let errorMessage = '语音识别出错';
      switch (event.error) {
        case 'no-speech':
          errorMessage = '未检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查权限';
          break;
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝';
          break;
        case 'network':
          errorMessage = '网络错误，请检查网络连接';
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
      }

      if (this.errorCallback) {
        this.errorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      if (this.endCallback) {
        this.endCallback();
      }
    };

    // 开始识别
    this.recognition.start();
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.endCallback = callback;
  }
}

/**
 * 百度语音API实现（备选方案）
 */
class BaiduSpeechProvider implements SpeechRecognitionProvider {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: string) => void;
  private endCallback?: () => void;

  isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      'MediaRecorder' in window
    );
  }

  async start(options: SpeechRecognitionOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MediaRecorder not supported');
    }

    try {
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建录音器
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const result = await this.recognizeWithBaidu(audioBlob);
          
          if (this.resultCallback) {
            this.resultCallback({
              text: result,
              confidence: 0.85, // 百度API通常有较高准确率
              isFinal: true
            });
          }
        } catch (error) {
          if (this.errorCallback) {
            this.errorCallback(`语音识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        } finally {
          // 停止音频流
          stream.getTracks().forEach(track => track.stop());
          if (this.endCallback) {
            this.endCallback();
          }
        }
      };

      // 开始录音
      this.mediaRecorder.start();
      
      // 设置自动停止（10秒后）
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, 10000);

    } catch (error) {
      if (this.errorCallback) {
        this.errorCallback(`无法访问麦克风: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  private async recognizeWithBaidu(audioBlob: Blob): Promise<string> {
    try {
      // 创建FormData上传音频文件
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // 调用后端语音识别API
      const response = await fetch('/api/speech/recognize', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || '语音识别失败');
      }

      return result.data.text;
    } catch (error) {
      console.error('[BaiduSpeechProvider] 识别失败:', error);
      throw new Error(`语音识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.endCallback = callback;
  }
}

/**
 * 语音识别管理器
 * 自动选择最佳的语音识别方案
 */
export class SpeechRecognitionManager {
  private provider: SpeechRecognitionProvider;

  constructor() {
    // 智能选择语音识别提供商
    const webSpeechProvider = new WebSpeechProvider();
    const baiduProvider = new BaiduSpeechProvider();

    if (webSpeechProvider.isSupported()) {
      console.log('[SpeechRecognition] 使用 Web Speech API');
      this.provider = webSpeechProvider;
    } else if (baiduProvider.isSupported()) {
      console.log('[SpeechRecognition] 使用百度语音API（备选方案）');
      this.provider = baiduProvider;
    } else {
      throw new Error('当前浏览器不支持语音识别功能');
    }
  }

  /**
   * 检查是否支持语音识别
   */
  static isSupported(): boolean {
    const webSpeechProvider = new WebSpeechProvider();
    const baiduProvider = new BaiduSpeechProvider();
    return webSpeechProvider.isSupported() || baiduProvider.isSupported();
  }

  /**
   * 开始语音识别
   */
  async start(options?: SpeechRecognitionOptions): Promise<void> {
    return this.provider.start(options);
  }

  /**
   * 停止语音识别
   */
  stop(): void {
    this.provider.stop();
  }

  /**
   * 监听识别结果
   */
  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.provider.onResult(callback);
  }

  /**
   * 监听错误事件
   */
  onError(callback: (error: string) => void): void {
    this.provider.onError(callback);
  }

  /**
   * 监听识别结束事件
   */
  onEnd(callback: () => void): void {
    this.provider.onEnd(callback);
  }

  /**
   * 获取当前使用的提供商类型
   */
  getProviderType(): string {
    if (this.provider instanceof WebSpeechProvider) {
      return 'WebSpeech';
    } else if (this.provider instanceof BaiduSpeechProvider) {
      return 'Baidu';
    }
    return 'Unknown';
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
