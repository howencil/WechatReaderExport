// Content Script - 内容脚本
// 注入到微信读书页面，提取笔记数据

console.log('微信读书笔记导出插件 - 内容脚本已加载');

// 检测当前页面是否为微信读书页面
function isWeReadPage(): boolean {
  return window.location.hostname.includes('weread.qq.com');
}

// 提取笔记数据的主函数
function extractNotes() {
  if (!isWeReadPage()) {
    console.log('当前页面不是微信读书页面');
    return [];
  }
  
  console.log('开始提取笔记数据...');
  
  // TODO: 实现具体的笔记提取逻辑
  const notes: any[] = [];
  
  return notes;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'EXTRACT_NOTES') {
    const notes = extractNotes();
    sendResponse({ success: true, data: notes });
  }
  
  return true;
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('微信读书页面加载完成');
  });
} else {
  console.log('微信读书页面已加载');
}