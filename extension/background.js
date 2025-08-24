// Background script
chrome.runtime.onInstalled.addListener(() => {
    console.log('inSPECt - Video Chat Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_chat' });
});
