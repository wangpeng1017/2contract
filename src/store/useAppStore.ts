import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface DocumentInfo {
  id: string;
  url: string;
  title: string;
  isValid: boolean;
  error?: string;
}

export interface ReplaceRule {
  id: string;
  searchText: string;
  replaceText: string;
  enabled: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  priority: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  structuredData?: any;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  error?: string;
}

interface AppState {
  // 工作流状态
  currentStep: number;
  steps: WorkflowStep[];
  
  // 文档信息
  document: DocumentInfo | null;
  
  // 替换规则
  rules: ReplaceRule[];
  
  // OCR结果
  ocrResult: OCRResult | null;
  
  // UI状态
  isLoading: boolean;
  error: string | null;
  
  // 操作历史
  operationHistory: Array<{
    id: string;
    timestamp: Date;
    type: 'document_parse' | 'ocr_extract' | 'text_replace';
    status: 'success' | 'error';
    details: any;
  }>;
}

interface AppActions {
  // 工作流控制
  setCurrentStep: (step: number) => void;
  updateStepStatus: (stepId: string, status: WorkflowStep['status'], error?: string) => void;
  resetWorkflow: () => void;
  
  // 文档操作
  setDocument: (document: DocumentInfo) => void;
  clearDocument: () => void;
  
  // 规则管理
  addRule: (rule: Omit<ReplaceRule, 'id'>) => void;
  updateRule: (id: string, updates: Partial<ReplaceRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  clearRules: () => void;
  importRules: (rules: ReplaceRule[]) => void;
  
  // OCR结果
  setOCRResult: (result: OCRResult) => void;
  clearOCRResult: () => void;
  
  // UI状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 操作历史
  addToHistory: (operation: Omit<AppState['operationHistory'][0], 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

const initialSteps: WorkflowStep[] = [
  {
    id: 'document_input',
    title: '输入文档链接',
    description: '输入飞书文档链接并验证访问权限',
    status: 'pending'
  },
  {
    id: 'ocr_upload',
    title: 'OCR识别',
    description: '上传截图并提取合同信息',
    status: 'pending'
  },
  {
    id: 'rules_setup',
    title: '设置替换规则',
    description: '配置文本替换规则和参数',
    status: 'pending'
  },
  {
    id: 'preview_changes',
    title: '预览更改',
    description: '预览替换结果并确认更改',
    status: 'pending'
  },
  {
    id: 'apply_changes',
    title: '应用更改',
    description: '执行文本替换并更新文档',
    status: 'pending'
  }
];

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // 初始状态
    currentStep: 0,
    steps: initialSteps,
    document: null,
    rules: [],
    ocrResult: null,
    isLoading: false,
    error: null,
    operationHistory: [],

    // 工作流控制
    setCurrentStep: (step) => set((state) => {
      state.currentStep = step;
      // 更新步骤状态
      state.steps.forEach((s, index) => {
        if (index < step) {
          s.status = 'completed';
        } else if (index === step) {
          s.status = 'active';
        } else {
          s.status = 'pending';
        }
      });
    }),

    updateStepStatus: (stepId, status, error) => set((state) => {
      const step = state.steps.find(s => s.id === stepId);
      if (step) {
        step.status = status;
        if (error) {
          step.error = error;
        }
      }
    }),

    resetWorkflow: () => set((state) => {
      state.currentStep = 0;
      state.steps = initialSteps.map(step => ({ ...step, status: 'pending', error: undefined }));
      state.document = null;
      state.rules = [];
      state.ocrResult = null;
      state.error = null;
    }),

    // 文档操作
    setDocument: (document) => set((state) => {
      state.document = document;
    }),

    clearDocument: () => set((state) => {
      state.document = null;
    }),

    // 规则管理
    addRule: (rule) => set((state) => {
      const newRule: ReplaceRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      state.rules.push(newRule);
    }),

    updateRule: (id, updates) => set((state) => {
      const rule = state.rules.find(r => r.id === id);
      if (rule) {
        Object.assign(rule, updates);
      }
    }),

    deleteRule: (id) => set((state) => {
      state.rules = state.rules.filter(r => r.id !== id);
    }),

    toggleRule: (id) => set((state) => {
      const rule = state.rules.find(r => r.id === id);
      if (rule) {
        rule.enabled = !rule.enabled;
      }
    }),

    clearRules: () => set((state) => {
      state.rules = [];
    }),

    importRules: (rules) => set((state) => {
      state.rules = rules.map(rule => ({
        ...rule,
        id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }),

    // OCR结果
    setOCRResult: (result) => set((state) => {
      state.ocrResult = result;
    }),

    clearOCRResult: () => set((state) => {
      state.ocrResult = null;
    }),

    // UI状态
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),

    setError: (error) => set((state) => {
      state.error = error;
    }),

    // 操作历史
    addToHistory: (operation) => set((state) => {
      const historyItem = {
        ...operation,
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
      state.operationHistory.unshift(historyItem);
      // 保留最近50条记录
      if (state.operationHistory.length > 50) {
        state.operationHistory = state.operationHistory.slice(0, 50);
      }
    }),

    clearHistory: () => set((state) => {
      state.operationHistory = [];
    })
  }))
);
