// Background Script - 后台脚本
// 处理插件的后台逻辑和消息传递

console.log('微信读书笔记导出插件 - 后台脚本已加载');

// Chrome Extension Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('插件已安装');
});

// 处理来自popup和content script的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('收到消息:', request);
  
  // 处理不同类型的消息
  switch (request.type) {
    case 'EXPORT_NOTES':
      // 处理导出笔记请求
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // 保持消息通道开放
});