/**
 * 语音输入组件
 * 支持语音转文字功能，集成到AI表单填充中
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, Check, X, AlertCircle, Zap } from 'lucide-react';
import { WebSpeechRecognition, SpeechRecognitionResult, SpeechRecognitionUtils } from '@/lib/speech-recognition';

export interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'result' | 'error';

export default function VoiceInput({ onResult, placeholder = '点击麦克风开始语音输入', disabled = false, className = '' }: VoiceInputProps) {
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{supported: boolean, browser: string, version?: string}>({ supported: false, browser: 'unknown' });
  const [resultQuality, setResultQuality] = useState<{quality: 'high' | 'medium' | 'low', score: number, suggestions: string[]} | null>(null);

  const speechRecognitionRef = useRef<WebSpeechRecognition | null>(null);

  useEffect(() => {
    // 检查浏览器支持
    const supported = WebSpeechRecognition.isSupported();
    const browserSupport = WebSpeechRecognition.getBrowserSupport();

    setIsSupported(supported);
    setBrowserInfo(browserSupport);

    if (supported) {
      try {
        speechRecognitionRef.current = new WebSpeechRecognition();

        // 设置事件监听器
        speechRecognitionRef.current.onStart(() => {
          console.log('[VoiceInput] 开始录音');
          setStatus('listening');
          setError(null);
        });

        speechRecognitionRef.current.onResult((result: SpeechRecognitionResult) => {
          if (result.isFinal) {
            const formattedText = SpeechRecognitionUtils.formatRecognitionText(result.text);
            const quality = SpeechRecognitionUtils.evaluateResultQuality({
              ...result,
              text: formattedText
            });

            setRecognizedText(formattedText);
            setInterimText('');
            setResultQuality(quality);
            setStatus('result');

            console.log(`[VoiceInput] 最终结果: "${formattedText}", 质量: ${quality.quality}`);
          } else {
            setInterimText(result.text);
          }
        });

        speechRecognitionRef.current.onError((errorMessage: string) => {
          setError(errorMessage);
          setStatus('error');
          setInterimText('');
          setResultQuality(null);
        });

        speechRecognitionRef.current.onEnd(() => {
          setStatus(prevStatus => {
            if (prevStatus === 'listening') {
              return 'processing';
            }
            return prevStatus;
          });
        });

      } catch (err) {
        console.error('语音识别初始化失败:', err);
        setIsSupported(false);
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.cleanup();
      }
    };
  }, []);

  const startListening = async () => {
    if (!speechRecognitionRef.current || disabled) return;

    try {
      setError(null);
      setRecognizedText('');
      setInterimText('');
      setResultQuality(null);

      // 使用推荐配置，但可以自定义语言
      const config = SpeechRecognitionUtils.getRecommendedConfig();
      config.language = SpeechRecognitionUtils.detectPreferredLanguage();

      await speechRecognitionRef.current.start(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '语音识别启动失败';
      setError(errorMessage);
      setStatus('error');
    }
  };

  const stopListening = () => {
    if (!speechRecognitionRef.current) return;

    speechRecognitionRef.current.stop();
    if (status === 'listening') {
      setStatus('processing');
    }
  };

  const confirmResult = () => {
    if (recognizedText) {
      onResult(recognizedText);
      resetState();
    }
  };

  const retryListening = () => {
    resetState();
    startListening();
  };

  const resetState = () => {
    setStatus('idle');
    setRecognizedText('');
    setInterimText('');
    setError(null);
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return placeholder;
      case 'listening':
        return '正在听取语音...';
      case 'processing':
        return '正在识别语音...';
      case 'result':
        return '识别完成，请确认结果';
      case 'error':
        return error || '识别出错';
      default:
        return placeholder;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'result':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isSupported) {
    const getBrowserRecommendation = () => {
      switch (browserInfo.browser) {
        case 'firefox':
          return {
            icon: <AlertCircle size={20} className="mr-2 text-orange-500" />,
            title: 'Firefox 需要手动启用语音识别',
            description: '请在地址栏输入 about:config，搜索 media.webspeech.recognition.enable 并设为 true',
            action: '启用后刷新页面即可使用'
          };
        case 'safari':
          return {
            icon: <MicOff size={20} className="mr-2 text-red-500" />,
            title: 'Safari 暂不支持 Web Speech API',
            description: '建议使用 Chrome、Edge 或 Firefox 浏览器',
            action: '或等待 Safari 未来版本支持'
          };
        case 'edge':
          return {
            icon: <AlertCircle size={20} className="mr-2 text-blue-500" />,
            title: 'Edge 浏览器需要更新',
            description: '请更新到最新版本的 Microsoft Edge',
            action: '更新后即可使用语音输入功能'
          };
        default:
          return {
            icon: <MicOff size={20} className="mr-2 text-gray-500" />,
            title: '当前浏览器不支持语音输入',
            description: '建议使用 Chrome 或 Edge 浏览器以获得最佳体验',
            action: '这些浏览器对 Web Speech API 有完整支持'
          };
      }
    };

    const recommendation = getBrowserRecommendation();

    return (
      <div className={`p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-start">
          {recommendation.icon}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700 mb-1">
              {recommendation.title}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {recommendation.description}
            </div>
            <div className="text-xs text-blue-600">
              💡 {recommendation.action}
            </div>
          </div>
        </div>

        {/* 浏览器支持状态 */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">浏览器支持状态：</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Chrome / Edge
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Firefox (需启用)
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Safari (不支持)
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              移动端 Chrome
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 语音输入控制区域 */}
      <div className="flex items-center space-x-3">
        {/* 主要控制按钮 */}
        {status === 'idle' || status === 'error' ? (
          <button
            onClick={startListening}
            disabled={disabled}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
              disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-lg hover:shadow-xl'
            }`}
            title="开始语音输入"
          >
            <Mic size={20} />
          </button>
        ) : status === 'listening' ? (
          <button
            onClick={stopListening}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-lg animate-pulse"
            title="停止录音"
          >
            <MicOff size={20} />
          </button>
        ) : (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white">
            <Volume2 size={20} className="animate-spin" />
          </div>
        )}

        {/* 状态文本 */}
        <div className="flex-1">
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-1">
            <Zap size={12} className="mr-1" />
            <span>Web Speech API</span>
            {browserInfo.browser && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                {browserInfo.browser === 'chrome' ? 'Chrome' :
                 browserInfo.browser === 'webkit' ? 'WebKit' :
                 browserInfo.browser}
              </span>
            )}
          </div>
        </div>

        {/* 结果确认按钮 */}
        {status === 'result' && (
          <div className="flex space-x-2">
            <button
              onClick={confirmResult}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
              title="确认使用此结果"
            >
              <Check size={16} />
            </button>
            <button
              onClick={retryListening}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              title="重新录音"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={resetState}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="取消"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 错误重试按钮 */}
        {status === 'error' && (
          <button
            onClick={retryListening}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            title="重试"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* 识别结果显示区域 */}
      {(recognizedText || interimText) && (
        <div className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            <span className="font-medium">识别结果：</span>
            {recognizedText && (
              <span className="text-gray-900 ml-2">{recognizedText}</span>
            )}
            {interimText && (
              <span className="text-gray-500 italic ml-2">{interimText}</span>
            )}
          </div>

          {/* 质量评估 */}
          {status === 'result' && resultQuality && (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center text-xs">
                <span className="text-gray-500 mr-2">质量评估:</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  resultQuality.quality === 'high' ? 'bg-green-100 text-green-700' :
                  resultQuality.quality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {resultQuality.quality === 'high' ? '优秀' :
                   resultQuality.quality === 'medium' ? '良好' : '较差'}
                </div>
                <span className="text-gray-400 ml-2">
                  {Math.round(resultQuality.score * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* 建议提示 */}
          {status === 'result' && resultQuality && resultQuality.suggestions.length > 0 && (
            <div className="mt-2 text-xs text-blue-600">
              💡 {resultQuality.suggestions[0]}
            </div>
          )}

          {status === 'result' && (
            <div className="text-xs text-gray-500 mt-2">
              请确认识别结果是否正确，然后点击 ✓ 确认使用
            </div>
          )}
        </div>
      )}

      {/* 错误信息显示 */}
      {status === 'error' && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-700">
            <span className="font-medium">错误：</span>
            {error}
          </div>
          <div className="text-xs text-red-500 mt-1">
            请检查麦克风权限或网络连接，然后重试
          </div>
        </div>
      )}

      {/* 使用提示和技巧 */}
      {status === 'idle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-800 font-medium mb-2">
            🎤 语音输入使用技巧
          </div>
          <div className="space-y-1 text-xs text-blue-700">
            <div>• 在安静环境中使用，避免背景噪音</div>
            <div>• 说话清晰，语速适中</div>
            <div>• 支持中文普通话，自动检测语言</div>
            <div>• 可以连续说话，系统会实时识别</div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            💡 首次使用需要授权麦克风权限
          </div>
        </div>
      )}

      {/* 实时状态提示 */}
      {status === 'listening' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="text-xs text-green-700 text-center">
            🔴 正在录音中... 请开始说话
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <div className="text-xs text-yellow-700 text-center">
            ⚡ 正在处理语音... 请稍候
          </div>
        </div>
      )}
    </div>
  );
}
