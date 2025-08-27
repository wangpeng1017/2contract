/**
 * PDF转换引擎
 * 将Word文档转换为PDF格式，保持原始格式和样式
 */

import mammoth from 'mammoth';
import puppeteer from 'puppeteer';

export interface PDFConversionOptions {
  format?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  scale?: number;
}

export interface PDFConversionResult {
  pdfBuffer: Buffer;
  metadata: {
    convertedAt: string;
    originalSize: number;
    pdfSize: number;
    pageCount?: number;
    conversionTime: number;
  };
}

/**
 * PDF转换器类
 */
export class PDFConverter {
  
  /**
   * 将Word文档转换为PDF
   */
  static async convertDocxToPDF(
    docxBuffer: ArrayBuffer,
    options: PDFConversionOptions = {}
  ): Promise<PDFConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('[PDFConverter] 开始转换Word文档到PDF');
      
      // 第一步：将DOCX转换为HTML
      const htmlContent = await this.convertDocxToHTML(docxBuffer);
      
      // 第二步：将HTML转换为PDF
      const pdfBuffer = await this.convertHTMLToPDF(htmlContent, options);
      
      const conversionTime = Date.now() - startTime;
      
      console.log(`[PDFConverter] 转换完成，耗时: ${conversionTime}ms`);
      
      return {
        pdfBuffer,
        metadata: {
          convertedAt: new Date().toISOString(),
          originalSize: docxBuffer.byteLength,
          pdfSize: pdfBuffer.length,
          conversionTime
        }
      };
      
    } catch (error) {
      console.error('[PDFConverter] PDF转换失败:', error);
      throw new Error(`PDF转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 将DOCX转换为HTML
   */
  private static async convertDocxToHTML(docxBuffer: ArrayBuffer): Promise<string> {
    try {
      console.log('[PDFConverter] 转换DOCX到HTML');
      
      // 使用mammoth转换docx到html
      const result = await mammoth.convertToHtml(
        { arrayBuffer: docxBuffer },
        {
          // 配置选项以保持更好的格式
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "p[style-name='Subtitle'] => h2.subtitle:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
          ],
          // 转换图片
          convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              };
            });
          })
        }
      );
      
      // 检查转换警告
      if (result.messages.length > 0) {
        console.warn('[PDFConverter] 转换警告:', result.messages);
      }
      
      // 包装HTML内容，添加样式
      const styledHTML = this.wrapHTMLWithStyles(result.value);
      
      return styledHTML;
      
    } catch (error) {
      console.error('[PDFConverter] DOCX到HTML转换失败:', error);
      throw new Error(`DOCX到HTML转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 为HTML添加样式
   */
  private static wrapHTMLWithStyles(htmlContent: string): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: "Microsoft YaHei", "SimSun", "Arial", sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: bold;
            margin-top: 1em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
        }
        
        h1 { font-size: 18pt; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
        
        p {
            margin: 0.5em 0;
            text-align: justify;
            orphans: 2;
            widows: 2;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            page-break-inside: avoid;
        }
        
        table, th, td {
            border: 1px solid #333;
        }
        
        th, td {
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        /* 保持列表格式 */
        ul, ol {
            margin: 0.5em 0;
            padding-left: 2em;
        }
        
        li {
            margin: 0.2em 0;
        }
        
        /* 强调样式 */
        strong, b {
            font-weight: bold;
        }
        
        em, i {
            font-style: italic;
        }
        
        /* 代码样式 */
        code {
            font-family: "Courier New", monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        /* 引用样式 */
        blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid #ccc;
            background-color: #f9f9f9;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
  }
  
  /**
   * 将HTML转换为PDF
   */
  private static async convertHTMLToPDF(
    htmlContent: string,
    options: PDFConversionOptions
  ): Promise<Buffer> {
    let browser;
    
    try {
      console.log('[PDFConverter] 启动浏览器转换HTML到PDF');
      
      // 启动puppeteer浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // 设置页面内容
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // 配置PDF选项
      const pdfOptions = {
        format: options.format || 'A4' as const,
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
        printBackground: options.printBackground !== false,
        scale: options.scale || 1,
        preferCSSPageSize: true
      };
      
      // 生成PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      console.log('[PDFConverter] PDF生成成功');
      
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('[PDFConverter] HTML到PDF转换失败:', error);
      throw new Error(`HTML到PDF转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * 获取默认PDF选项
   */
  static getDefaultOptions(): PDFConversionOptions {
    return {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1
    };
  }
  
  /**
   * 验证PDF选项
   */
  static validateOptions(options: PDFConversionOptions): boolean {
    if (options.format && !['A4', 'A3', 'Letter'].includes(options.format)) {
      return false;
    }
    
    if (options.orientation && !['portrait', 'landscape'].includes(options.orientation)) {
      return false;
    }
    
    if (options.scale && (options.scale < 0.1 || options.scale > 2)) {
      return false;
    }
    
    return true;
  }
}
