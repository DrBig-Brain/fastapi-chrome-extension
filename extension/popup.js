document.addEventListener('DOMContentLoaded', function() {
    const chatToggle = document.getElementById('chat-toggle');
    const statusDiv = document.getElementById('status');
    const settingsBtn = document.getElementById('settings-btn');
    
    // Check API key on load
    checkApiKey();
    
    // Load current state from storage
    chrome.storage.local.get(['chatWindowOpen'], function(result) {
        chatToggle.checked = result.chatWindowOpen || false;
        updateStatus(chatToggle.checked);
    });
    
    // Settings button click
    settingsBtn.addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        });
    });
    
    // Handle switch toggle
    chatToggle.addEventListener('change', async function() {
        const isChecked = this.checked;
        
        // Check API key first
        const hasApiKey = await checkApiKey();
        if (!hasApiKey && isChecked) {
            this.checked = false;
            statusDiv.textContent = '⚠️ Please set up your API key first';
            statusDiv.className = 'status warning';
            return;
        }
        
        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                // Send message to content script
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'toggle_chat',
                    forceState: isChecked 
                });
                
                // Save state
                chrome.storage.local.set({ chatWindowOpen: isChecked });
                
                // Update status
                updateStatus(isChecked);
                
                // Auto-close popup after a delay
                setTimeout(() => {
                    window.close();
                }, 800);
            } else {
                throw new Error('No active tab found');
            }
        } catch (error) {
            console.error('Error toggling chat:', error);
            statusDiv.textContent = 'Error: ' + error.message;
            statusDiv.className = 'status error';
            
            // Reset switch on error
            this.checked = !isChecked;
        }
    });
    
    function checkApiKey() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['geminiApiKey', 'geminiModel'], function(result) {
                const hasKey = !!(result.geminiApiKey && result.geminiApiKey.trim());
                const hasModel = !!(result.geminiModel);
                resolve(hasKey && hasModel);
            });
        });
    }
    
    function updateStatus(isOpen) {
        if (isOpen) {
            statusDiv.textContent = '✅ Chat window is open';
            statusDiv.className = 'status success';
        } else {
            statusDiv.textContent = '⭕ Chat window is closed';
            statusDiv.className = 'status';
        }
    }
});
