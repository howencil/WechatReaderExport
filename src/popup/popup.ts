// Popup Script - 弹窗脚本
// 处理用户界面交互和导出操作

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
  private formatSelect: HTMLSelectElement;
  private progressSection: HTMLElement;
  private resultSection: HTMLElement;

  constructor() {
    this.statusElement = document.getElementById('status')!;
    this.exportButton = document.getElementById('export-btn') as HTMLButtonElement;
    this.formatSelect = document.getElementById('export-format') as HTMLSelectElement;
    this.progressSection = document.getElementById('progress')!;
    this.resultSection = document.getElementById('result')!;
    
    this.init();
  }

  private init() {
    // 绑定事件监听器
    this.exportButton.addEventListener('click', () => this.handleExport());
    
    // 检测当前页面状态
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

      if (tab.url.includes('weread.qq.com')) {
        this.updateStatus('检测到微信读书页面 ✓', 'success');
        this.exportButton.disabled = false;
      } else {
        this.updateStatus('请先打开微信读书页面', 'warning');
        this.exportButton.disabled = true;
      }
    } catch (error) {
      console.error('检测页面失败:', error);
      this.updateStatus('页面检测失败', 'error');
    }
  }

  private updateStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.statusElement.textContent = message;
    this.statusElement.className = `status-info status-${type}`;
  }

  private async handleExport() {
    const format = this.formatSelect.value as keyof typeof exportFormats;
    const exportFormat = exportFormats[format];

    if (!exportFormat) {
      this.showResult('不支持的导出格式', 'error');
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
        throw new Error('提取笔记失败');
      }

      // TODO: 处理导出逻辑
      await this.exportNotes(response.data, exportFormat);
      
      this.showResult(`笔记导出成功 (${exportFormat.name})`, 'success');
    } catch (error) {
      console.error('导出失败:', error);
      this.showResult(`导出失败: ${error}`, 'error');
    } finally {
      this.showProgress(false);
      this.exportButton.disabled = false;
    }
  }

  private async exportNotes(notes: any[], format: ExportFormat) {
    // TODO: 实现具体的导出逻辑
    console.log('导出笔记:', notes, format);
    
    // 模拟导出过程
    await new Promise(resolve => setTimeout(resolve, 1000));
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
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});