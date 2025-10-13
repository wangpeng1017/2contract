/**
 * 全局状态管理 - Zustand
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Variable } from './api-client';

// ==================== 模板状态 ====================

interface TemplateState {
  // 当前模板
  currentTemplate: {
    id: string;
    name: string;
    file?: File;
    text?: string;
    placeholders?: string[];
  } | null;
  
  // 提取的变量
  variables: Variable[];
  
  // 表单数据
  formData: Record<string, any>;
  
  // 生成的文档
  generatedDocument: {
    id: string;
    filename: string;
    downloadUrl: string;
    fileSize: number;
  } | null;
  
  // 操作
  setCurrentTemplate: (template: TemplateState['currentTemplate']) => void;
  setVariables: (variables: Variable[]) => void;
  setFormData: (data: Record<string, any>) => void;
  updateFormField: (name: string, value: any) => void;
  setGeneratedDocument: (doc: TemplateState['generatedDocument']) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateState>()(
  immer((set) => ({
    currentTemplate: null,
    variables: [],
    formData: {},
    generatedDocument: null,
    
    setCurrentTemplate: (template) =>
      set((state) => {
        state.currentTemplate = template;
      }),
    
    setVariables: (variables) =>
      set((state) => {
        state.variables = variables;
        // 初始化表单数据
        state.formData = variables.reduce((acc, v) => {
          acc[v.name] = v.default_value || '';
          return acc;
        }, {} as Record<string, any>);
      }),
    
    setFormData: (data) =>
      set((state) => {
        state.formData = data;
      }),
    
    updateFormField: (name, value) =>
      set((state) => {
        state.formData[name] = value;
      }),
    
    setGeneratedDocument: (doc) =>
      set((state) => {
        state.generatedDocument = doc;
      }),
    
    reset: () =>
      set((state) => {
        state.currentTemplate = null;
        state.variables = [];
        state.formData = {};
        state.generatedDocument = null;
      }),
  }))
);

// ==================== UI 状态 ====================

interface UIState {
  // 加载状态
  isLoading: boolean;
  loadingMessage: string;
  
  // 错误状态
  error: string | null;
  
  // 当前步骤 (1: 上传, 2: 填写, 3: 下载)
  currentStep: 1 | 2 | 3;
  
  // 操作
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setCurrentStep: (step: UIState['currentStep']) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    isLoading: false,
    loadingMessage: '',
    error: null,
    currentStep: 1,
    
    setLoading: (isLoading, message = '') =>
      set((state) => {
        state.isLoading = isLoading;
        state.loadingMessage = message;
      }),
    
    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
    
    setCurrentStep: (step) =>
      set((state) => {
        state.currentStep = step;
      }),
    
    reset: () =>
      set((state) => {
        state.isLoading = false;
        state.loadingMessage = '';
        state.error = null;
        state.currentStep = 1;
      }),
  }))
);

// ==================== 缓存状态 ====================

interface CacheState {
  stats: {
    totalKeys: number;
    memoryUsageMB?: number;
  } | null;
  
  setStats: (stats: CacheState['stats']) => void;
}

export const useCacheStore = create<CacheState>()(
  immer((set) => ({
    stats: null,
    
    setStats: (stats) =>
      set((state) => {
        state.stats = stats;
      }),
  }))
);
