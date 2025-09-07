import { WeReadPageType, PageDetectionResult, BookInfo } from '@/types';

/**
 * 微信读书页面检测器
 * 用于识别当前页面类型和提取基础信息
 */
export class WeReadPageDetector {
  
  /**
   * 检测当前页面类型和支持情况
   */
  public static detectPage(): PageDetectionResult {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // 检查是否为微信读书域名
    if (!this.isWeReadDomain()) {
      return {
        pageType: WeReadPageType.UNKNOWN,
        isSupported: false,
        message: '当前页面不是微信读书网站'
      };
    }

    // 根据URL路径判断页面类型
    if (pathname.includes('/web/reader/')) {
      return this.detectReaderPage();
    } else if (pathname.includes('/web/bookDetail/')) {
      return this.detectBookDetailPage();
    } else if (pathname.includes('/web/book/') && url.includes('type=note')) {
      return this.detectNotePage();
    } else if (pathname.includes('/web/shelf')) {
      return this.detectShelfPage();
    } else if (pathname.includes('/web/review/')) {
      return this.detectReviewPage();
    } else {
      return {
        pageType: WeReadPageType.UNKNOWN,
        isSupported: false,
        message: '未识别的微信读书页面类型'
      };
    }
  }

  /**
   * 检查是否为微信读书域名
   */
  private static isWeReadDomain(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'weread.qq.com' || hostname.endsWith('.weread.qq.com');
  }

  /**
   * 检测阅读页面
   */
  private static detectReaderPage(): PageDetectionResult {
    const bookInfo = this.extractBookInfoFromReader();
    
    return {
      pageType: WeReadPageType.READER,
      isSupported: true,
      bookInfo: bookInfo || undefined,
      message: '检测到阅读页面，支持导出笔记'
    };
  }

  /**
   * 检测书籍详情页
   */
  private static detectBookDetailPage(): PageDetectionResult {
    const bookInfo = this.extractBookInfoFromDetail();
    
    return {
      pageType: WeReadPageType.BOOK_DETAIL,
      isSupported: false,
      bookInfo: bookInfo || undefined,
      message: '检测到书籍详情页，请进入笔记页面进行导出'
    };
  }

  /**
   * 检测笔记页面
   */
  private static detectNotePage(): PageDetectionResult {
    const bookInfo = this.extractBookInfoFromNotes();
    const noteCount = this.countNotesOnPage();
    
    return {
      pageType: WeReadPageType.NOTES,
      isSupported: true,
      bookInfo: bookInfo || undefined,
      noteCount,
      message: `检测到笔记页面，发现 ${noteCount} 条笔记`
    };
  }

  /**
   * 检测书架页面
   */
  private static detectShelfPage(): PageDetectionResult {
    return {
      pageType: WeReadPageType.SHELF,
      isSupported: false,
      message: '检测到书架页面，请选择具体书籍进入笔记页面'
    };
  }

  /**
   * 检测书评页面
   */
  private static detectReviewPage(): PageDetectionResult {
    return {
      pageType: WeReadPageType.REVIEW,
      isSupported: false,
      message: '检测到书评页面，不支持笔记导出'
    };
  }

  /**
   * 从阅读页面提取书籍信息
   */
  private static extractBookInfoFromReader(): BookInfo | undefined {
    try {
      // 尝试从阅读器页面提取书籍信息
      const titleElement = document.querySelector('.readerTopBar_title_link');
      const title = titleElement?.textContent?.trim() || '';

      // 从URL中提取bookId
      const urlMatch = window.location.pathname.match(/\/web\/reader\/([^/]+)/);
      const bookId = urlMatch ? urlMatch[1] : '';

      if (title && bookId) {
        return {
          bookId,
          title,
          author: '' // 阅读页面通常不直接显示作者信息
        };
      }
    } catch (error) {
      console.warn('提取阅读页面书籍信息失败:', error);
    }
    
    return undefined;
  }

  /**
   * 从书籍详情页提取书籍信息
   */
  private static extractBookInfoFromDetail(): BookInfo | undefined {
    try {
      // 书籍标题
      const titleElement = document.querySelector('.bookInfo_title') || 
                          document.querySelector('[data-testid="bookTitle"]');
      const title = titleElement?.textContent?.trim() || '';

      // 作者信息
      const authorElement = document.querySelector('.bookInfo_author') ||
                           document.querySelector('[data-testid="bookAuthor"]');
      const author = authorElement?.textContent?.trim() || '';

      // 书籍封面
      const coverElement = document.querySelector('.bookInfo_cover img') as HTMLImageElement;
      const cover = coverElement?.src || '';

      // 从URL中提取bookId
      const urlMatch = window.location.pathname.match(/\/web\/bookDetail\/([^/]+)/);
      const bookId = urlMatch ? urlMatch[1] : '';

      if (title && bookId) {
        return {
          bookId,
          title,
          author,
          cover
        };
      }
    } catch (error) {
      console.warn('提取书籍详情信息失败:', error);
    }
    
    return undefined;
  }

  /**
   * 从笔记页面提取书籍信息
   */
  private static extractBookInfoFromNotes(): BookInfo | undefined {
    try {
      // 笔记页面的书籍信息通常在页面顶部
      const titleElement = document.querySelector('.bookTitle') ||
                          document.querySelector('.noteHeader_bookTitle') ||
                          document.querySelector('[data-testid="noteBookTitle"]');
      const title = titleElement?.textContent?.trim() || '';

      const authorElement = document.querySelector('.bookAuthor') ||
                           document.querySelector('.noteHeader_bookAuthor') ||
                           document.querySelector('[data-testid="noteBookAuthor"]');
      const author = authorElement?.textContent?.trim() || '';

      // 从URL参数中提取bookId
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('bookId') || '';

      if (title && bookId) {
        return {
          bookId,
          title,
          author
        };
      }
    } catch (error) {
      console.warn('提取笔记页面书籍信息失败:', error);
    }
    
    return undefined;
  }

  /**
   * 统计页面上的笔记数量
   */
  private static countNotesOnPage(): number {
    try {
      // 查找笔记元素
      const noteElements = document.querySelectorAll(
        '.noteItem, .note-item, [data-testid="noteItem"], .reviewItem'
      );
      return noteElements.length;
    } catch (error) {
      console.warn('统计笔记数量失败:', error);
      return 0;
    }
  }
}