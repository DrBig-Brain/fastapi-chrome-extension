document.getElementById('toggle-chat').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_chat' });
    
    document.getElementById('status').textContent = 'Chat toggled!';
    
    setTimeout(() => {
        window.close();
    }, 500);
});
