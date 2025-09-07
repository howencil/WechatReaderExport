import { NoteData, BookInfo } from '@/types';

/**
 * 微信读书笔记提取器
 * 用于从页面DOM中提取笔记数据
 */
export class WeReadNoteExtractor {
  
  /**
   * 提取页面上的所有笔记
   */
  public static async extractNotes(bookInfo: BookInfo): Promise<NoteData[]> {
    console.log('开始提取笔记数据...');
    
    const notes: NoteData[] = [];
    
    try {
      // 等待页面内容加载
      await this.waitForNotesToLoad();
      
      // 查找所有笔记元素
      const noteElements = this.findNoteElements();
      console.log(`发现 ${noteElements.length} 个笔记元素`);
      
      // 逐个提取笔记数据
      for (const element of Array.from(noteElements)) {
        const noteData = this.extractSingleNote(element, bookInfo, notes.length);
        
        if (noteData) {
          notes.push(noteData);
        }
      }
      
      console.log(`成功提取 ${notes.length} 条笔记`);
      return notes;
      
    } catch (error) {
      console.error('提取笔记数据失败:', error);
      throw new Error(`笔记提取失败: ${error}`);
    }
  }

  /**
   * 等待笔记内容加载完成
   */
  private static async waitForNotesToLoad(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkLoaded = () => {
        const noteElements = this.findNoteElements();
        
        if (noteElements.length > 0) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('笔记加载超时'));
          return;
        }
        
        setTimeout(checkLoaded, 100);
      };
      
      checkLoaded();
    });
  }

  /**
   * 查找页面上的所有笔记元素
   */
  private static findNoteElements(): Element[] {
    // 尝试不同的选择器来匹配笔记元素
    const selectors = [
      '.noteItem',                    // 常见的笔记项目类名
      '.note-item',
      '.reviewItem',                  // 书评项目
      '.annotation-item',             // 标注项目
      '[data-testid="noteItem"]',     // 测试ID选择器
      '.noteListItem',               // 笔记列表项
      '.highlight-item',             // 高亮项目
      '.wr_note_item',               // 微信读书笔记项目
      '.bookReview_review_item',     // 书评项目
      '.shelf_book_note_item'        // 书架笔记项目
    ];

    let elements: Element[] = [];
    
    // 尝试每个选择器
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        elements = Array.from(found);
        console.log(`使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
        break;
      }
    }

    // 如果没找到，尝试更通用的方法
    if (elements.length === 0) {
      elements = this.findNoteElementsByPattern();
    }

    return Array.from(elements);
  }

  /**
   * 通过模式匹配查找笔记元素
   */
  private static findNoteElementsByPattern(): Element[] {
    const elements: Element[] = [];
    
    // 查找包含笔记特征的元素
    const allElements = document.querySelectorAll('div, article, section');
    
    for (const element of Array.from(allElements)) {
      if (this.looksLikeNoteElement(element)) {
        elements.push(element);
      }
    }
    
    console.log(`通过模式匹配找到 ${elements.length} 个可能的笔记元素`);
    return elements;
  }

  /**
   * 判断元素是否看起来像笔记元素
   */
  private static looksLikeNoteElement(element: Element): boolean {
    const text = element.textContent || '';
    const className = element.className || '';
    
    // 检查是否包含笔记相关的关键词
    const noteKeywords = ['笔记', '标注', '想法', '批注', '高亮'];
    const hasNoteKeywords = noteKeywords.some(keyword => 
      className.includes(keyword) || text.includes(keyword)
    );
    
    // 检查是否有合理的文本长度
    const hasReasonableText = text.trim().length > 10 && text.trim().length < 5000;
    
    // 检查是否包含时间信息
    const timePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}:\d{2}|\d+分钟前|\d+小时前|\d+天前/;
    const hasTimeInfo = timePattern.test(text);
    
    return hasNoteKeywords && hasReasonableText && hasTimeInfo;
  }

  /**
   * 从单个元素中提取笔记数据
   */
  private static extractSingleNote(element: Element, bookInfo: BookInfo, index: number): NoteData | null {
    try {
      // 提取笔记ID
      const id = this.extractNoteId(element, index);
      
      // 提取原文摘录
      const originalText = this.extractOriginalText(element);
      
      // 提取笔记内容
      const noteContent = this.extractNoteContent(element);
      
      // 提取章节信息
      const chapterTitle = this.extractChapterTitle(element);
      
      // 提取时间信息
      const createTime = this.extractCreateTime(element);
      
      // 提取笔记类型
      const noteType = this.extractNoteType(element);
      
      // 提取标注颜色
      const color = this.extractHighlightColor(element);
      
      // 验证必要字段
      if (!originalText && !noteContent) {
        console.warn(`索引 ${index} 的笔记内容为空，跳过`);
        return null;
      }

      return {
        id,
        bookId: bookInfo.bookId,
        bookTitle: bookInfo.title,
        bookAuthor: bookInfo.author,
        bookCover: bookInfo.cover || undefined,
        chapterTitle,
        noteContent,
        originalText,
        createTime,
        noteType,
        color
      };
      
    } catch (error) {
      console.warn(`提取索引 ${index} 的笔记失败:`, error);
      return null;
    }
  }

  /**
   * 提取笔记ID
   */
  private static extractNoteId(element: Element, index: number): string {
    // 尝试从元素属性中获取ID
    const id = element.getAttribute('data-id') || 
              element.getAttribute('id') ||
              element.getAttribute('data-note-id');
    
    if (id) {
      return id;
    }
    
    // 生成基于内容的哈希ID
    const text = element.textContent || '';
    const hash = this.simpleHash(text);
    return `note_${hash}_${index}`;
  }

  /**
   * 提取原文摘录
   */
  private static extractOriginalText(element: Element): string {
    const selectors = [
      '.originalText',
      '.quote-text',
      '.highlight-text',
      '.annotation-text',
      '.note-quote',
      '.review-quote',
      '.noteItem_originalText',
      '.bookmarkText'
    ];

    for (const selector of selectors) {
      const textElement = element.querySelector(selector);
      if (textElement && textElement.textContent) {
        return textElement.textContent.trim();
      }
    }

    // 如果没找到专门的原文元素，尝试查找引用样式的文本
    const quotedElements = Array.from(element.querySelectorAll('blockquote, .quote, [style*="italic"]'));
    for (const quotedElement of quotedElements) {
      if (quotedElement.textContent && quotedElement.textContent.trim().length > 10) {
        return quotedElement.textContent.trim();
      }
    }

    return '';
  }

  /**
   * 提取笔记内容
   */
  private static extractNoteContent(element: Element): string {
    const selectors = [
      '.noteContent',
      '.note-content',
      '.review-content', 
      '.annotation-content',
      '.user-note',
      '.noteItem_content',
      '.thoughtText'
    ];

    for (const selector of selectors) {
      const contentElement = element.querySelector(selector);
      if (contentElement && contentElement.textContent) {
        return contentElement.textContent.trim();
      }
    }

    return '';
  }

  /**
   * 提取章节标题
   */
  private static extractChapterTitle(element: Element): string {
    const selectors = [
      '.chapterTitle',
      '.chapter-title',
      '.note-chapter',
      '.section-title',
      '.noteItem_chapter'
    ];

    for (const selector of selectors) {
      const chapterElement = element.querySelector(selector);
      if (chapterElement && chapterElement.textContent) {
        return chapterElement.textContent.trim();
      }
    }

    return '未知章节';
  }

  /**
   * 提取创建时间
   */
  private static extractCreateTime(element: Element): string {
    const selectors = [
      '.createTime',
      '.note-time',
      '.timestamp',
      '.time-info',
      '.noteItem_time',
      '.review-time'
    ];

    for (const selector of selectors) {
      const timeElement = element.querySelector(selector);
      if (timeElement && timeElement.textContent) {
        return this.normalizeTime(timeElement.textContent.trim());
      }
    }

    // 尝试从元素文本中提取时间
    const text = element.textContent || '';
    const timeMatch = text.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}[\s\d:]+|\d+分钟前|\d+小时前|\d+天前/);
    if (timeMatch) {
      return this.normalizeTime(timeMatch[0]);
    }

    return new Date().toISOString();
  }

  /**
   * 提取笔记类型
   */
  private static extractNoteType(element: Element): 'highlight' | 'thought' | 'bookmark' {
    const className = element.className.toLowerCase();
    const text = element.textContent?.toLowerCase() || '';

    if (className.includes('highlight') || text.includes('高亮')) {
      return 'highlight';
    }
    
    if (className.includes('thought') || className.includes('review') || text.includes('想法')) {
      return 'thought';
    }
    
    if (className.includes('bookmark') || text.includes('书签')) {
      return 'bookmark';
    }

    // 默认为高亮类型
    return 'highlight';
  }

  /**
   * 提取标注颜色
   */
  private static extractHighlightColor(element: Element): string {
    // 查找颜色相关的类名或样式
    const style = element.getAttribute('style') || '';
    const className = element.className || '';

    const colorMap: { [key: string]: string } = {
      'yellow': '#FFEB3B',
      'green': '#4CAF50', 
      'blue': '#2196F3',
      'red': '#F44336',
      'orange': '#FF9800'
    };

    for (const [colorName, colorCode] of Object.entries(colorMap)) {
      if (className.includes(colorName) || style.includes(colorName)) {
        return colorCode;
      }
    }

    return '#FFEB3B'; // 默认黄色
  }

  /**
   * 标准化时间格式
   */
  private static normalizeTime(timeStr: string): string {
    try {
      // 处理相对时间
      if (timeStr.includes('分钟前')) {
        const minutes = parseInt(timeStr);
        const date = new Date(Date.now() - minutes * 60 * 1000);
        return date.toISOString();
      }
      
      if (timeStr.includes('小时前')) {
        const hours = parseInt(timeStr);
        const date = new Date(Date.now() - hours * 60 * 60 * 1000);
        return date.toISOString();
      }
      
      if (timeStr.includes('天前')) {
        const days = parseInt(timeStr);
        const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return date.toISOString();
      }

      // 尝试解析绝对时间
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
    } catch (error) {
      console.warn('时间解析失败:', timeStr, error);
    }
    
    return new Date().toISOString();
  }

  /**
   * 简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(16);
  }
}