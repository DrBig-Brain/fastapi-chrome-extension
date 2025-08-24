# Video Chat Assistant Chrome Extension

A Chrome extension that adds an AI-powered chat interface to video platforms, powered by Google's Gemini AI. The assistant can answer questions about video content in real-time.

## Features

- 🎥 Works with YouTube, Vimeo, and other video platforms
- 💬 Floating, resizable chat window
- 🤖 AI-powered responses using Gemini 2.0
- ⚡ Real-time video context awareness
- 🔄 Maintains conversation history
- 🖱️ Drag and resize chat interface

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up the Chrome extension:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `extension` folder

3. Start the backend server:
```bash
cd backend
python main.py
```

## Usage

1. Click the extension icon in Chrome to toggle the chat window
2. Open any video page (YouTube, Vimeo, etc.)
3. Ask questions about the video content
4. The AI assistant will provide contextually relevant responses

## Project Structure

```
├── backend/
│   └── main.py           # FastAPI backend server
├── extension/
│   ├── manifest.json     # Extension configuration
│   ├── popup.html       # Extension popup UI
│   ├── popup.js        # Popup functionality
│   ├── content.js      # Main extension script
│   └── background.js   # Background service worker
├── requirements.txt    # Python dependencies
└── .gitignore
```

## Technical Details

- **Backend**: FastAPI + Google Gemini AI
- **Frontend**: Vanilla JavaScript
- **Communication**: WebSocket for real-time chat
- **AI Features**:
  - Context-aware responses
  - Timestamp understanding
  - Dynamic response length
  - Intent detection
  - Conversation history

## Requirements

- Python 3.8+
- Google Chrome browser
- Google Gemini API key
- Required Python packages (see requirements.txt)

## Development

1. Clone the repository
2. Add your Gemini API key to `apikey.txt`
3. Install dependencies
4. Start the backend server
5. Load the extension in Chrome

## Security Note

Remember to keep your API key secure and never commit it to version control.