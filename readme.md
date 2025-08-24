# inSPECt - Video Chat Assistant Chrome Extension

A Chrome extension that adds an AI-powered chat interface to video platforms, powered by Google's Gemini AI. The assistant can answer questions about video content in real-time.

## Features

- 🎥 **Platform Support**: Works with YouTube, Vimeo, and other video platforms
- 💬 **Smart Interface**: Floating, resizable chat window with drag-and-drop support
- 🤖 **Gemini AI**: Powered by Google's latest Gemini language models
- ⚡ **Real-time Context**: Video awareness with timestamp understanding
- 🔄 **Conversation History**: Maintains chat context for better responses
- ⚙️ **Configurable**: Choose from multiple Gemini model variants
- 🔒 **Secure**: API keys stored locally, never shared

## Installation

1. **Backend Setup**
   ```bash
   # Create and activate virtual environment (recommended)
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   .venv\Scripts\activate     # Windows

   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Chrome Extension Setup**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `extension` folder

3. **API Key Configuration**
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click the extension icon and open Settings
   - Enter your API key and select preferred model

4. **Start Backend Server**
   ```bash
   cd backend
   python main.py
   ```

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI backend server
│   └── __pycache__/           # Python cache files
├── extension/
│   ├── manifest.json          # Extension configuration
│   ├── popup.html            # Extension popup UI
│   ├── popup.js             # Popup functionality
│   ├── settings.html        # Settings page
│   ├── settings.js         # Settings management
│   ├── content.js         # Main extension script
│   ├── background.js     # Background service worker
│   └── icons/
│       └── spec_logo.png  # Extension icon
├── requirements.txt      # Python dependencies
├── apikey.txt          # API key storage (gitignored)
└── .gitignore
```

## Technical Details

### Backend
- **Framework**: FastAPI
- **AI Provider**: Google Gemini AI
- **Features**:
  - WebSocket communication
  - Real-time video context tracking
  - Dynamic response length detection
  - Timestamp awareness
  - Model fallback handling

### Frontend
- **Type**: Chrome Extension
- **Components**:
  - Popup interface
  - Settings management
  - Floating chat window
  - Real-time connection status
- **Features**:
  - Drag and resize support
  - Minimizable window
  - Message history
  - Model selection

## Supported Gemini Models

- **Latest (Recommended)**
  - `gemini-2.5-flash`: Best price-performance
  - `gemini-2.5-pro`: Most advanced reasoning
  - `gemini-2.5-flash-lite`: Cost-efficient

- **Specialized**
  - `gemini-2.0-flash`: Next-gen features
  - `gemini-2.0-flash-lite`: Low latency

- **Legacy**
  - `gemini-1.5-pro`: Complex reasoning
  - `gemini-1.5-flash`: Versatile performance
  - `gemini-1.5-flash-8b`: Lightweight

## Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd chrom_extention
   ```

2. Install dependencies and set up environment as described in Installation

3. Make your changes and test thoroughly

4. To reload extension changes:
   - Navigate to `chrome://extensions/`
   - Click the refresh icon on the extension card

## Security Notes

- API keys are stored locally in Chrome's storage
- Backend server runs locally on port 8000
- CORS is enabled for extension communication
- Never commit API keys to version control

## Requirements

- Python 3.8+
- Google Chrome browser
- Gemini API key
- Required Python packages (see requirements.txt)

## Troubleshooting

- **Chat Not Connecting**: Ensure backend server is running
- **Invalid API Key**: Verify key format (starts with 'AIza')
- **Model Errors**: Try falling back to `gemini-1.5-flash`
- **Extension Not Loading**: Check Chrome