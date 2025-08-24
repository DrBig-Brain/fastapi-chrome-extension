// Content script - runs on video pages
let websocket = null;
let chatWindow = null;
let isDragging = false;
let isResizing = false;
let dragOffset = { x: 0, y: 0 };
let resizeHandle = null;

// Connect to Python backend
function connectWebSocket() {
    websocket = new WebSocket('ws://localhost:8000/ws/chat');
    
    websocket.onopen = function(event) {
        console.log('Connected to backend');
        sendApiKey(); // Send API key first
        setTimeout(sendVideoUpdate, 500); // Then send video update
    };
    
    websocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_response') {
            displayMessage(data.message, 'assistant');
        } else if (data.type === 'error') {
            displayMessage('❌ ' + data.message, 'assistant');
        }
    };
    
    websocket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

// Send API key and model configuration
function sendApiKey() {
    chrome.storage.local.get(['geminiApiKey', 'geminiModel'], function(result) {
        if (result.geminiApiKey && websocket && websocket.readyState === WebSocket.OPEN) {
            const model = result.geminiModel || 'gemini-2.5-flash'; // Default to 2.5 Flash
            websocket.send(JSON.stringify({
                type: 'config',
                api_key: result.geminiApiKey,
                model: model
            }));
        }
    });
}

// Get current video information
function getVideoContext() {
    const video = document.querySelector('video');
    const platform = getPlatform();
    
    return {
        url: window.location.href,
        title: document.title,
        currentTime: video ? Math.floor(video.currentTime) : 0,
        duration: video ? Math.floor(video.duration) : 0,
        platform: platform,
        hasVideo: !!video
    };
}

function getPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) return 'YouTube';
    if (hostname.includes('vimeo.com')) return 'Vimeo';
    if (hostname.includes('netflix.com')) return 'Netflix';
    if (hostname.includes('twitch.tv')) return 'Twitch';
    if (hostname.includes('dailymotion.com')) return 'Dailymotion';
    return 'Unknown';
}

// Send video context to backend
function sendVideoUpdate() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const videoData = getVideoContext();
        websocket.send(JSON.stringify({
            type: 'video_update',
            video_data: videoData
        }));
    }
}

// Create floating resizable chat window
function createChatWindow() {
    if (chatWindow) return; // Already exists
    
    chatWindow = document.createElement('div');
    chatWindow.id = 'video-chat-extension';
    
    // Get the extension URL for the logo
    const logoUrl = chrome.runtime.getURL('icons/spec_logo.png');
    
    chatWindow.innerHTML = `
        <div id="chat-header">
            <div id="header-left">
                <img src="${logoUrl}" id="chat-logo" alt="inSPECt">
                <span>inSPECt</span>
            </div>
            <div id="header-right">
                <button id="minimize-chat">−</button>
                <button id="close-chat">✖</button>
            </div>
        </div>
        <div id="chat-messages"></div>
        <div id="chat-input-container">
            <input type="text" id="chat-input" placeholder="Ask about this video...">
            <button id="send-button">Send</button>
        </div>
        <div id="resize-handle"></div>
    `;
    
    // Add CSS styles with resize capability
    chatWindow.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        width: 320px;
        height: 400px;
        min-width: 280px;
        min-height: 300px;
        max-width: 600px;
        max-height: 800px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: hidden;
    `;
    
    document.body.appendChild(chatWindow);
    addChatStyles();
    attachEventListeners();
}

function addChatStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #video-chat-extension {
            font-size: 14px !important;
        }
        
        #chat-header {
            background: #4285f4;
            color: white;
            padding: 12px 16px;
            border-radius: 8px 8px 0 0;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            user-select: none;
            height: 48px;
            min-height: 48px;
        }
        
        #header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        
        #chat-logo {
            width: 24px;
            height: 24px;
            border-radius: 3px;
            flex-shrink: 0;
            object-fit: contain;
            background: rgba(255,255,255,0.1);
            padding: 2px;
        }
        
        #chat-header span {
            font-weight: bold;
            font-size: 15px;
            line-height: 1.2;
            white-space: nowrap;
        }
        
        #header-right {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        
        #minimize-chat, #close-chat {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            width: 24px;
            height: 24px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-weight: bold;
        }
        
        #minimize-chat:hover, #close-chat:hover {
            background: rgba(255,255,255,0.2);
        }
        
        #chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            background: #f9f9f9;
            min-height: 200px;
        }
        
        .message {
            margin: 6px 0;
            padding: 6px 8px;
            border-radius: 6px;
            max-width: 85%;
            font-size: 13px;
            line-height: 1.3;
            word-wrap: break-word;
        }
        
        .user-message {
            background: #e3f2fd;
            margin-left: auto;
            text-align: right;
            border: 1px solid #bbdefb;
        }
        
        .assistant-message {
            background: white;
            border: 1px solid #ddd;
            margin-right: auto;
        }
        
        #chat-input-container {
            display: flex;
            padding: 8px;
            background: white;
            border-radius: 0 0 8px 8px;
            flex-shrink: 0;
            gap: 6px;
        }
        
        #chat-input {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            outline: none;
        }
        
        #chat-input:focus {
            border-color: #4285f4;
        }
        
        #send-button {
            padding: 6px 12px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            flex-shrink: 0;
        }
        
        #send-button:hover {
            background: #3367d6;
        }
        
        #resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background: linear-gradient(-45deg, 
                transparent 0px, transparent 4px,
                #ccc 4px, #ccc 6px,
                transparent 6px, transparent 8px,
                #ccc 8px, #ccc 10px,
                transparent 10px, transparent 12px,
                #ccc 12px, #ccc 14px,
                transparent 14px);
            cursor: nw-resize;
        }
        
        .minimized {
            height: 48px !important;
        }
        
        .minimized #chat-messages,
        .minimized #chat-input-container,
        .minimized #resize-handle {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function attachEventListeners() {
    let isMinimized = false;
    let originalHeight = '400px';
    
    // Minimize button
    document.getElementById('minimize-chat').onclick = function() {
        if (isMinimized) {
            chatWindow.style.height = originalHeight;
            chatWindow.classList.remove('minimized');
            this.textContent = '−';
            isMinimized = false;
        } else {
            originalHeight = chatWindow.style.height;
            chatWindow.classList.add('minimized');
            this.textContent = '□';
            isMinimized = true;
        }
    };
    
    // Close button
    document.getElementById('close-chat').onclick = function() {
        chatWindow.remove();
        chatWindow = null;
        // Update storage state
        chrome.storage.local.set({ chatWindowOpen: false });
    };
    
    // Send message
    const sendMessage = () => {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;
        
        displayMessage(message, 'user');
        input.value = '';
        
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'chat',
                message: message
            }));
        }
    };
    
    document.getElementById('send-button').onclick = sendMessage;
    document.getElementById('chat-input').onkeypress = function(e) {
        if (e.key === 'Enter') sendMessage();
    };
    
    // Make draggable
    const header = document.getElementById('chat-header');
    header.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons
        
        isDragging = true;
        dragOffset.x = e.clientX - chatWindow.offsetLeft;
        dragOffset.y = e.clientY - chatWindow.offsetTop;
        
        e.preventDefault();
    };
    
    // Resize functionality
    resizeHandle = document.getElementById('resize-handle');
    resizeHandle.onmousedown = function(e) {
        isResizing = true;
        e.preventDefault();
        e.stopPropagation();
    };
    
    document.onmousemove = function(e) {
        if (isDragging && !isResizing) {
            const newLeft = e.clientX - dragOffset.x;
            const newTop = e.clientY - dragOffset.y;
            
            // Keep window within viewport
            const maxLeft = window.innerWidth - chatWindow.offsetWidth;
            const maxTop = window.innerHeight - chatWindow.offsetHeight;
            
            chatWindow.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            chatWindow.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            chatWindow.style.right = 'auto';
            chatWindow.style.bottom = 'auto';
        } else if (isResizing) {
            const rect = chatWindow.getBoundingClientRect();
            const newWidth = Math.max(280, Math.min(600, e.clientX - rect.left));
            const newHeight = Math.max(300, Math.min(800, e.clientY - rect.top));
            
            chatWindow.style.width = newWidth + 'px';
            chatWindow.style.height = newHeight + 'px';
        }
    };
    
    document.onmouseup = function() {
        isDragging = false;
        isResizing = false;
    };
    
    // Prevent text selection while dragging
    document.onselectstart = function() {
        return !(isDragging || isResizing);
    };
}

function displayMessage(message, sender) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Listen for video changes
setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        sendVideoUpdate();
    }
}, 5000);

// Initialize when page loads - MANUAL CONTROL ONLY
setTimeout(() => {
    connectWebSocket();
    // Chat window will ONLY open when user clicks the extension toggle
    // No automatic opening based on video detection
}, 2000);

// Listen for extension messages with proper response handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle_chat') {
        try {
            if (request.forceState !== undefined) {
                // Force specific state (open/close)
                if (request.forceState && !chatWindow) {
                    // Force open
                    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
                        connectWebSocket();
                    }
                    createChatWindow();
                } else if (!request.forceState && chatWindow) {
                    // Force close
                    chatWindow.remove();
                    chatWindow = null;
                }
            } else {
                // Toggle behavior (original)
                if (chatWindow) {
                    chatWindow.remove();
                    chatWindow = null;
                } else {
                    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
                        connectWebSocket();
                    }
                    createChatWindow();
                }
            }
            
            // Save current state
            chrome.storage.local.set({ chatWindowOpen: !!chatWindow });
            
            // Send success response
            sendResponse({ success: true, isOpen: !!chatWindow });
            
        } catch (error) {
            console.error('Error in toggle_chat:', error);
            sendResponse({ success: false, error: error.message });
        }
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    }
});
