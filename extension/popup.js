document.addEventListener('DOMContentLoaded', function() {
    const chatToggle = document.getElementById('chat-toggle');
    const statusDiv = document.getElementById('status');
    
    // Load current state from storage
    chrome.storage.local.get(['chatWindowOpen'], function(result) {
        chatToggle.checked = result.chatWindowOpen || false;
        updateStatus(chatToggle.checked);
    });
    
    // Handle switch toggle
    chatToggle.addEventListener('change', async function() {
        const isChecked = this.checked;
        
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
    
    function updateStatus(isOpen) {
        if (isOpen) {
            statusDiv.textContent = 'Chat window is open';
            statusDiv.className = 'status success';
        } else {
            statusDiv.textContent = 'Chat window is closed';
            statusDiv.className = 'status';
        }
    }
});
