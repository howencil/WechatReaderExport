// 微信读书页面类型枚举
export enum WeReadPageType {
  UNKNOWN = 'unknown',
  BOOK_DETAIL = 'book_detail',      // 书籍详情页
  READER = 'reader',                // 阅读页面
  NOTES = 'notes',                  // 笔记页面
  SHELF = 'shelf',                  // 书架页面
  REVIEW = 'review'                 // 书评页面
}

// 笔记数据结构
export interface NoteData {
  id: string;                       // 笔记唯一ID
  bookId: string;                   // 书籍ID
  bookTitle: string;                // 书籍标题
  bookAuthor: string;               // 书籍作者
  bookCover?: string;               // 书籍封面URL
  chapterTitle: string;             // 章节标题
  noteContent: string;              // 笔记内容
  originalText: string;             // 原文摘录
  pageNumber?: number;              // 页码
  location?: string;                // 位置信息
  createTime: string;               // 创建时间
  updateTime?: string;              // 更新时间
  noteType: 'highlight' | 'thought' | 'bookmark'; // 笔记类型
  color?: string;                   // 标注颜色
}

// 书籍信息
export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
  isbn?: string;
  publisher?: string;
  publishDate?: string;
  description?: string;
}

// 导出数据格式
export interface ExportData {
  bookInfo: BookInfo;
  notes: NoteData[];
  exportTime: string;
  totalCount: number;
}

// 页面检测结果
export interface PageDetectionResult {
  pageType: WeReadPageType;
  isSupported: boolean;
  bookInfo?: BookInfo;
  noteCount?: number;
  message: string;
}