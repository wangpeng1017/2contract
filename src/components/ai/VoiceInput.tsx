/**
 * 语音输入组件
 * 支持语音转文字功能，集成到AI表单填充中
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, Check, X } from 'lucide-react';
import { SpeechRecognitionManager, SpeechRecognitionResult } from '@/lib/speech-recognition';

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
  const [providerType, setProviderType] = useState<string>('');

  const speechManagerRef = useRef<SpeechRecognitionManager | null>(null);

  useEffect(() => {
    // 检查浏览器支持
    const supported = SpeechRecognitionManager.isSupported();
    setIsSupported(supported);

    if (supported) {
      try {
        speechManagerRef.current = new SpeechRecognitionManager();
        setProviderType(speechManagerRef.current.getProviderType());
        
        // 设置事件监听器
        speechManagerRef.current.onResult((result: SpeechRecognitionResult) => {
          if (result.isFinal) {
            setRecognizedText(result.text);
            setInterimText('');
            setStatus('result');
          } else {
            setInterimText(result.text);
          }
        });

        speechManagerRef.current.onError((errorMessage: string) => {
          setError(errorMessage);
          setStatus('error');
          setInterimText('');
        });

        speechManagerRef.current.onEnd(() => {
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
      if (speechManagerRef.current) {
        speechManagerRef.current.stop();
      }
    };
  }, []);

  const startListening = async () => {
    if (!speechManagerRef.current || disabled) return;

    try {
      setStatus('listening');
      setError(null);
      setRecognizedText('');
      setInterimText('');

      await speechManagerRef.current.start({
        language: 'zh-CN',
        continuous: true,
        interimResults: true,
        maxAlternatives: 1
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '语音识别启动失败';
      setError(errorMessage);
      setStatus('error');
    }
  };

  const stopListening = () => {
    if (!speechManagerRef.current) return;

    speechManagerRef.current.stop();
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
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center text-gray-500">
          <MicOff size={20} className="mr-2" />
          <span className="text-sm">当前浏览器不支持语音输入功能</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          建议使用 Chrome 或 Edge 浏览器以获得最佳体验
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
          {providerType && (
            <div className="text-xs text-gray-400">
              使用 {providerType === 'WebSpeech' ? 'Web Speech API' : '百度语音API'}
            </div>
          )}
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
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            <span className="font-medium">识别结果：</span>
            {recognizedText && (
              <span className="text-gray-900">{recognizedText}</span>
            )}
            {interimText && (
              <span className="text-gray-500 italic">{interimText}</span>
            )}
          </div>
          {status === 'result' && (
            <div className="text-xs text-gray-500 mt-1">
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

      {/* 使用提示 */}
      {status === 'idle' && (
        <div className="text-xs text-gray-500">
          💡 提示：点击麦克风按钮开始语音输入，支持中文识别。请确保在安静环境中使用以获得最佳效果。
        </div>
      )}
    </div>
  );
}
