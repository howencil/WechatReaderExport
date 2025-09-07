import { WeReadPageType, PageDetectionResult, ExportData } from '@/types';

interface ExportFormat {
  value: string;
  extension: string;
  name: string;
}

const exportFormats: Record<string, ExportFormat> = {
  markdown: { value: 'markdown', extension: 'md', name: 'Markdown' },
  json: { value: 'json', extension: 'json', name: 'JSON' },
  txt: { value: 'txt', extension: 'txt', name: '纯文本' }
};

class PopupController {
  private statusElement: HTMLElement;
  private exportButton: HTMLButtonElement;
  private refreshButton: HTMLButtonElement;
  private formatSelect: HTMLSelectElement;
  private progressSection: HTMLElement;
  private resultSection: HTMLElement;
  private helpText: HTMLElement;

  private currentPageInfo: PageDetectionResult | null = null;

  constructor() {
    this.statusElement = document.getElementById('status')!;
    this.exportButton = document.getElementById('export-btn') as HTMLButtonElement;
    this.refreshButton = document.getElementById('refresh-btn') as HTMLButtonElement;
    this.formatSelect = document.getElementById('export-format') as HTMLSelectElement;
    this.progressSection = document.getElementById('progress')!;
    this.resultSection = document.getElementById('result')!;
    this.helpText = document.querySelector('.help-text')!;
    
    this.init();
  }

  private init() {
    // 绑定事件监听器
    this.exportButton.addEventListener('click', () => this.handleExport());
    this.refreshButton.addEventListener('click', () => this.handleRefresh());
    
    // 初始化页面检测
    this.checkCurrentPage();
  }

  private async checkCurrentPage() {
    try {
      // 获取当前活跃标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url) {
        this.updateStatus('无法获取当前页面信息', 'error');
        return;
      }

      // 基础URL检查
      if (!tab.url.includes('weread.qq.com')) {
        this.updateStatus('请先打开微信读书页面', 'warning');
        this.updateHelpText('请访问 weread.qq.com 后重新打开插件');
        this.exportButton.disabled = true;
        return;
      }

      // 从content script获取详细页面信息
      if (!tab.id) {
        this.updateStatus('无法获取标签页ID', 'error');
        return;
      }

      this.updateStatus('正在检测页面...', 'info');

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
        
        if (response.success) {
          this.currentPageInfo = response.data;
          this.updateUIFromPageInfo();
        } else {
          throw new Error(response.error || '获取页面信息失败');
        }
      } catch (error) {
        // content script可能还没加载，稍后重试
        console.log('Content script未就绪，3秒后重试...');
        setTimeout(() => this.retryPageCheck(tab.id!), 3000);
      }

    } catch (error) {
      console.error('检测页面失败:', error);
      this.updateStatus('页面检测失败', 'error');
    }
  }

  private async retryPageCheck(tabId: number) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' });
      
      if (response.success) {
        this.currentPageInfo = response.data;
        this.updateUIFromPageInfo();
      } else {
        this.updateStatus('页面检测失败，请刷新页面后重试', 'error');
      }
    } catch (error) {
      this.updateStatus('无法连接到页面，请刷新后重试', 'error');
      console.error('重试页面检测失败:', error);
    }
  }

  private updateUIFromPageInfo() {
    if (!this.currentPageInfo) {
      return;
    }

    const { pageType, isSupported, bookInfo, noteCount, message } = this.currentPageInfo;

    // 更新状态显示
    if (isSupported) {
      this.updateStatus(message, 'success');
      this.exportButton.disabled = false;
      
      if (bookInfo) {
        this.updateHelpText(`《${bookInfo.title}》${bookInfo.author ? ` - ${bookInfo.author}` : ''}`);
      }
      
      if (typeof noteCount === 'number') {
        this.updateStatus(`${message} (共${noteCount}条)`, 'success');
      }
    } else {
      this.updateStatus(message, 'warning');
      this.exportButton.disabled = true;
      this.updateHelpText(this.getHelpTextForPageType(pageType));
    }
  }

  private getHelpTextForPageType(pageType: WeReadPageType): string {
    switch (pageType) {
      case WeReadPageType.UNKNOWN:
        return '请访问微信读书网站';
      case WeReadPageType.SHELF:
        return '请选择书籍进入笔记页面';
      case WeReadPageType.BOOK_DETAIL:
        return '请点击"笔记"进入笔记页面';
      case WeReadPageType.REVIEW:
        return '书评页面不支持笔记导出';
      default:
        return '请进入支持的页面类型';
    }
  }

  private async handleRefresh() {
    this.refreshButton.disabled = true;
    this.updateStatus('正在刷新检测...', 'info');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_PAGE_DETECTION' });
        
        if (response.success) {
          this.currentPageInfo = response.data;
          this.updateUIFromPageInfo();
        } else {
          this.updateStatus('刷新失败: ' + response.error, 'error');
        }
      }
    } catch (error) {
      this.updateStatus('刷新失败，请重新打开插件', 'error');
      console.error('刷新失败:', error);
    } finally {
      this.refreshButton.disabled = false;
    }
  }

  private updateStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.statusElement.textContent = message;
    this.statusElement.className = `status-info status-${type}`;
  }

  private updateHelpText(text: string) {
    this.helpText.textContent = text;
  }

  private async handleExport() {
    const format = this.formatSelect.value as keyof typeof exportFormats;
    const exportFormat = exportFormats[format];

    if (!exportFormat) {
      this.showResult('不支持的导出格式', 'error');
      return;
    }

    if (!this.currentPageInfo?.isSupported) {
      this.showResult('当前页面不支持导出', 'error');
      return;
    }

    try {
      this.showProgress(true);
      this.exportButton.disabled = true;

      // 获取当前活跃标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('无法获取标签页ID');
      }

      // 向content script发送消息提取笔记
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOTES' });
      
      if (!response.success) {
        throw new Error(response.error || '提取笔记失败');
      }

      const exportData: ExportData = response.data;
      
      // 处理导出
      await this.processExport(exportData, exportFormat);
      
      this.showResult(`成功导出 ${exportData.totalCount} 条笔记 (${exportFormat.name})`, 'success');
      
    } catch (error) {
      console.error('导出失败:', error);
      this.showResult(`导出失败: ${error}`, 'error');
    } finally {
      this.showProgress(false);
      this.exportButton.disabled = false;
    }
  }

  private async processExport(exportData: ExportData, format: ExportFormat) {
    let content: string;
    let filename: string;

    // 生成文件名
    const bookTitle = exportData.bookInfo.title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    filename = `${bookTitle}_笔记_${timestamp}.${format.extension}`;

    // 根据格式转换数据
    switch (format.value) {
      case 'markdown':
        content = this.convertToMarkdown(exportData);
        break;
      case 'json':
        content = this.convertToJSON(exportData);
        break;
      case 'txt':
        content = this.convertToText(exportData);
        break;
      default:
        throw new Error('不支持的导出格式');
    }

    // 下载文件
    await this.downloadFile(content, filename);
  }

  private convertToMarkdown(exportData: ExportData): string {
    const { bookInfo, notes, exportTime, totalCount } = exportData;
    
    let markdown = `# ${bookInfo.title}\n\n`;
    
    if (bookInfo.author) {
      markdown += `**作者:** ${bookInfo.author}\n\n`;
    }
    
    markdown += `**导出时间:** ${new Date(exportTime).toLocaleString('zh-CN')}\n`;
    markdown += `**笔记数量:** ${totalCount} 条\n\n`;
    markdown += `---\n\n`;

    // 按章节分组
    const notesByChapter = new Map<string, typeof notes>();
    notes.forEach(note => {
      const chapter = note.chapterTitle || '未分类';
      if (!notesByChapter.has(chapter)) {
        notesByChapter.set(chapter, []);
      }
      notesByChapter.get(chapter)!.push(note);
    });

    // 生成markdown内容
    notesByChapter.forEach((chapterNotes, chapterTitle) => {
      markdown += `## ${chapterTitle}\n\n`;
      
      chapterNotes.forEach((note, index) => {
        markdown += `### 笔记 ${index + 1}\n\n`;
        
        if (note.originalText) {
          markdown += `> ${note.originalText}\n\n`;
        }
        
        if (note.noteContent) {
          markdown += `**我的想法:** ${note.noteContent}\n\n`;
        }
        
        markdown += `*创建时间: ${new Date(note.createTime).toLocaleString('zh-CN')}*\n\n`;
        markdown += `---\n\n`;
      });
    });

    return markdown;
  }

  private convertToJSON(exportData: ExportData): string {
    return JSON.stringify(exportData, null, 2);
  }

  private convertToText(exportData: ExportData): string {
    const { bookInfo, notes, exportTime, totalCount } = exportData;
    
    let text = `${bookInfo.title}\n`;
    text += `${'='.repeat(bookInfo.title.length)}\n\n`;
    
    if (bookInfo.author) {
      text += `作者: ${bookInfo.author}\n`;
    }
    
    text += `导出时间: ${new Date(exportTime).toLocaleString('zh-CN')}\n`;
    text += `笔记数量: ${totalCount} 条\n\n`;

    notes.forEach((note, index) => {
      text += `笔记 ${index + 1}\n`;
      text += `-`.repeat(10) + '\n';
      text += `章节: ${note.chapterTitle}\n`;
      
      if (note.originalText) {
        text += `原文: ${note.originalText}\n`;
      }
      
      if (note.noteContent) {
        text += `笔记: ${note.noteContent}\n`;
      }
      
      text += `时间: ${new Date(note.createTime).toLocaleString('zh-CN')}\n\n`;
    });

    return text;
  }

  private async downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // 使用Chrome下载API
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
    
    // 清理对象URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private showProgress(show: boolean) {
    this.progressSection.style.display = show ? 'block' : 'none';
    this.resultSection.style.display = 'none';
  }

  private showResult(message: string, type: 'success' | 'error') {
    const resultText = this.resultSection.querySelector('.result-text') as HTMLElement;
    resultText.textContent = message;
    resultText.className = `result-text result-${type}`;
    
    this.progressSection.style.display = 'none';
    this.resultSection.style.display = 'block';
    
    // 3秒后自动隐藏结果
    setTimeout(() => {
      this.resultSection.style.display = 'none';
    }, 3000);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});