import { WeReadPageDetector } from '@/utils/pageDetector';
import { WeReadNoteExtractor } from '@/utils/noteExtractor';
import { WeReadPageType, PageDetectionResult, ExportData } from '@/types';

console.log('微信读书笔记导出插件 - 内容脚本已加载');

// 页面检测结果缓存
let currentPageDetection: PageDetectionResult | null = null;

// 初始化页面检测
function initializePageDetection() {
  try {
    currentPageDetection = WeReadPageDetector.detectPage();
    console.log('页面检测结果:', currentPageDetection);
    
    // 通知背景脚本页面状态
    chrome.runtime.sendMessage({
      type: 'PAGE_DETECTED',
      data: currentPageDetection
    });
    
  } catch (error) {
    console.error('页面检测失败:', error);
    currentPageDetection = {
      pageType: WeReadPageType.UNKNOWN,
      isSupported: false,
      message: '页面检测发生错误'
    };
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Content script 收到消息:', request);
  
  switch (request.type) {
    case 'GET_PAGE_INFO':
      handleGetPageInfo(sendResponse);
      break;
      
    case 'EXTRACT_NOTES':
      handleExtractNotes(sendResponse);
      break;
      
    case 'REFRESH_PAGE_DETECTION':
      handleRefreshPageDetection(sendResponse);
      break;
      
    default:
      sendResponse({ 
        success: false, 
        error: `未知的消息类型: ${request.type}` 
      });
  }
  
  return true; // 保持消息通道开放
});

/**
 * 处理获取页面信息请求
 */
function handleGetPageInfo(sendResponse: (response: any) => void) {
  try {
    if (!currentPageDetection) {
      initializePageDetection();
    }
    
    sendResponse({
      success: true,
      data: currentPageDetection
    });
  } catch (error) {
    console.error('获取页面信息失败:', error);
    sendResponse({
      success: false,
      error: `获取页面信息失败: ${error}`
    });
  }
}

/**
 * 处理提取笔记请求
 */
async function handleExtractNotes(sendResponse: (response: any) => void) {
  try {
    // 检查当前页面是否支持笔记提取
    if (!currentPageDetection) {
      initializePageDetection();
    }
    
    if (!currentPageDetection?.isSupported) {
      sendResponse({
        success: false,
        error: currentPageDetection?.message || '当前页面不支持笔记导出'
      });
      return;
    }

    if (!currentPageDetection.bookInfo) {
      sendResponse({
        success: false,
        error: '无法获取书籍信息'
      });
      return;
    }

    console.log('开始提取笔记...');
    
    // 显示加载状态
    showExtractionStatus('正在提取笔记数据...');
    
    // 提取笔记数据
    const notes = await WeReadNoteExtractor.extractNotes(currentPageDetection.bookInfo);
    
    // 构建导出数据
    const exportData: ExportData = {
      bookInfo: currentPageDetection.bookInfo,
      notes: notes,
      exportTime: new Date().toISOString(),
      totalCount: notes.length
    };
    
    console.log('笔记提取完成:', exportData);
    
    // 隐藏加载状态
    hideExtractionStatus();
    
    sendResponse({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('提取笔记失败:', error);
    hideExtractionStatus();
    
    sendResponse({
      success: false,
      error: `笔记提取失败: ${error}`
    });
  }
}

/**
 * 处理刷新页面检测请求
 */
function handleRefreshPageDetection(sendResponse: (response: any) => void) {
  try {
    console.log('刷新页面检测...');
    initializePageDetection();
    
    sendResponse({
      success: true,
      data: currentPageDetection
    });
  } catch (error) {
    console.error('刷新页面检测失败:', error);
    sendResponse({
      success: false,
      error: `刷新页面检测失败: ${error}`
    });
  }
}

/**
 * 显示提取状态提示
 */
function showExtractionStatus(message: string) {
  // 移除已存在的状态提示
  hideExtractionStatus();
  
  // 创建状态提示元素
  const statusDiv = document.createElement('div');
  statusDiv.id = 'weread-export-status';
  statusDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00D26A;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 210, 106, 0.3);
    animation: fadeIn 0.3s ease;
  `;
  
  statusDiv.textContent = message;
  document.body.appendChild(statusDiv);
  
  // 添加CSS动画
  if (!document.getElementById('weread-export-styles')) {
    const styles = document.createElement('style');
    styles.id = 'weread-export-styles';
    styles.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styles);
  }
}

/**
 * 隐藏提取状态提示
 */
function hideExtractionStatus() {
  const statusDiv = document.getElementById('weread-export-status');
  if (statusDiv) {
    statusDiv.remove();
  }
}

// 监听URL变化，重新检测页面
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log('URL发生变化，重新检测页面');
    lastUrl = currentUrl;
    setTimeout(() => {
      initializePageDetection();
    }, 1000); // 延迟检测，等待页面内容加载
  }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('微信读书页面加载完成，开始初始化');
    setTimeout(initializePageDetection, 500);
    
    // 开始监听URL变化
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
} else {
  console.log('微信读书页面已加载，开始初始化');
  setTimeout(initializePageDetection, 500);
  
  // 开始监听URL变化
  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}