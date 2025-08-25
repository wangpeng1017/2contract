// 用户相关类型
export interface User {
  id: string;
  feishuUserId: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 认证相关类型
export interface AuthToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface FeishuOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface FeishuUserInfo {
  sub: string;
  name: string;
  picture?: string;
  open_id: string;
  union_id: string;
}

// 文档相关类型
export interface FeishuDocument {
  document_id: string;
  title: string;
  owner_id: string;
  create_time: string;
  update_time: string;
  url: string;
}

export interface DocumentBlock {
  block_id: string;
  block_type: string;
  text?: {
    content: string;
    style?: any;
  };
  children?: DocumentBlock[];
}

export interface DocumentContent {
  document: FeishuDocument;
  blocks: DocumentBlock[];
}

// 文档权限相关类型
export interface DocumentPermissions {
  canRead: boolean;
  canWrite: boolean;
  canComment: boolean;
  canManage: boolean;
}

export interface DocumentPermissionCheck {
  documentId: string;
  hasPermission: boolean;
  permissions: string[];
  document?: FeishuDocument;
  error?: string;
  errorCode?: string;
}

export interface DocumentActionCheck {
  documentId: string;
  action: string;
  canPerform: boolean;
  error?: string;
  errorCode?: string;
}

// 文档结构化解析相关类型
export interface ParsedBlock {
  id: string;
  type: string;
  content: string;
  level: number;
  parent?: string;
  children: ParsedBlock[];
  metadata: {
    style?: any;
    attributes?: Record<string, any>;
    position: {
      start: number;
      end: number;
    };
  };
}

export interface TableStructure {
  id: string;
  rows: number;
  columns: number;
  headers: string[];
  data: string[][];
  metadata: {
    hasHeader: boolean;
    cellStyles?: any[][];
  };
}

export interface ListStructure {
  id: string;
  type: 'bullet' | 'ordered';
  items: Array<{
    id: string;
    content: string;
    level: number;
    children: ListStructure[];
  }>;
}

export interface DocumentStructure {
  document: FeishuDocument;
  blocks: ParsedBlock[];
  outline: Array<{
    id: string;
    level: number;
    title: string;
    children: any[];
  }>;
  tables: TableStructure[];
  lists: ListStructure[];
  images: Array<{
    id: string;
    url?: string;
    alt?: string;
    caption?: string;
  }>;
  statistics: {
    totalBlocks: number;
    textBlocks: number;
    headings: number;
    tables: number;
    lists: number;
    images: number;
    wordCount: number;
    characterCount: number;
  };
}

export interface DocumentSearchResult {
  blockId: string;
  blockType: string;
  content: string;
  matches: Array<{
    start: number;
    end: number;
    text: string;
    context: string;
  }>;
  path: string[];
}

// 文本替换相关类型
export interface ReplaceRule {
  id: string;
  searchText: string;
  replaceText: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface ReplaceResult {
  ruleId: string;
  searchText: string;
  replaceText: string;
  matchCount: number;
  replacedCount: number;
  success: boolean;
  error?: string;
}

export interface BatchReplaceRequest {
  documentId: string;
  rules: ReplaceRule[];
}

export interface BatchReplaceResponse {
  documentId: string;
  results: ReplaceResult[];
  totalMatches: number;
  totalReplacements: number;
  success: boolean;
  error?: string;
}

// OCR相关类型
export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCRResponse {
  results: OCRResult[];
  fullText: string;
  processingTime: number;
}

export interface ParsedOCRData {
  [key: string]: string;
}

export interface OCRParseResult {
  parsedData: ParsedOCRData;
  suggestedRules: ReplaceRule[];
  confidence: number;
}

// 操作日志类型
export interface OperationLog {
  id: string;
  userId: string;
  documentId: string;
  operationType: 'text_replace' | 'ocr_replace';
  details: any;
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
}

// 文件上传类型
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// API响应类型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// 前端状态类型
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentDocument: FeishuDocument | null;
  replaceRules: ReplaceRule[];
  isLoading: boolean;
  error: string | null;
}

// 组件Props类型
export interface DocumentInputProps {
  onDocumentLoad: (document: FeishuDocument) => void;
  isLoading?: boolean;
}

export interface ReplaceRulesProps {
  rules: ReplaceRule[];
  onRulesChange: (rules: ReplaceRule[]) => void;
  onExecute: (rules: ReplaceRule[]) => void;
  isLoading?: boolean;
}

export interface OCRUploadProps {
  onOCRComplete: (result: OCRParseResult) => void;
  isLoading?: boolean;
}

export interface ResultDisplayProps {
  result: BatchReplaceResponse | null;
  onReset: () => void;
}

// 表单验证类型
export interface DocumentFormData {
  documentUrl: string;
}

export interface ReplaceRuleFormData {
  searchText: string;
  replaceText: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

// 配置类型
export interface AppConfig {
  feishu: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };
  database: {
    url: string;
  };
  storage: {
    blobToken: string;
    kvUrl: string;
    kvToken: string;
  };
  encryption: {
    key: string;
    jwtSecret: string;
  };
  ocr?: {
    baiduApiKey: string;
    baiduSecretKey: string;
  };
}
