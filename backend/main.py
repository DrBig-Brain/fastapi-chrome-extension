from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import json
import asyncio
from typing import Dict, List
import re

app = FastAPI()

# Enable CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
genai.configure(api_key="your-api-key-here")  # Replace with your API key
model = genai.GenerativeModel('gemini-2.0-flash')

# Store active connections
active_connections: List[WebSocket] = []

class VideoContext:
    def __init__(self):
        self.current_video = {}
        self.chat_history = []

video_context = VideoContext()

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "video_update":
                # Update video context
                video_context.current_video = message["video_data"]
                await websocket.send_text(json.dumps({
                    "type": "status",
                    "message": "Video context updated"
                }))
                
            elif message["type"] == "chat":
                # Process chat message with Gemini
                user_message = message["message"]
                response = await get_gemini_response(user_message)
                
                # Store in chat history
                video_context.chat_history.append({
                    "user": user_message,
                    "assistant": response
                })
                
                await websocket.send_text(json.dumps({
                    "type": "chat_response",
                    "message": response
                }))
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)

def needs_timestamp_context(user_message: str) -> bool:
    """Check if user is asking for timestamp-related information"""
    
    message_lower = user_message.lower()
    
    # Explicit timestamp requests
    timestamp_keywords = [
        'timestamp', 'time', 'when', 'at what time', 'minute', 'second',
        'current time', 'where am i', 'at this point', 'right now',
        'at this moment', 'here', 'this part', 'this section',
        'what\'s happening now', 'currently', 'at this timestamp'
    ]
    
    return any(keyword in message_lower for keyword in timestamp_keywords)

def detect_response_length(user_message: str) -> str:
    """Detect if user wants detailed or standard response"""
    
    message_lower = user_message.lower()
    
    # Detailed response indicators
    detail_keywords = [
        'detailed', 'details', 'elaborate', 'explain in detail', 'more info',
        'comprehensive', 'thorough', 'step by step', 'breakdown', 'deep dive',
        'everything about', 'tell me more', 'expand on', 'fully explain',
        'complete explanation', 'in depth', 'extensively'
    ]
    
    # Quick response indicators
    quick_keywords = [
        'quickly', 'brief', 'short', 'simply', 'just tell me', 'in summary',
        'tldr', 'quick answer', 'simple answer', 'one sentence'
    ]
    
    if any(keyword in message_lower for keyword in detail_keywords):
        return "detailed"
    elif any(keyword in message_lower for keyword in quick_keywords):
        return "brief"
    else:
        return "standard"

def detect_intent(user_message: str) -> str:
    """Detect user intent for appropriate response"""
    
    message_lower = user_message.lower()
    
    # Summary intents
    if any(word in message_lower for word in ['summary', 'summarize', 'what is this', 'about', 'overview']):
        return "summary"
    
    # Explanation intents
    elif any(word in message_lower for word in ['explain', 'how does', 'why does', 'what does', 'meaning']):
        return "explanation"
    
    # Time-based intents
    elif needs_timestamp_context(user_message):
        return "timestamp"
    
    # Key points/highlights
    elif any(word in message_lower for word in ['key points', 'important', 'highlights', 'main ideas', 'takeaways']):
        return "keypoints"
    
    # Tutorial/learning
    elif any(word in message_lower for word in ['how to', 'tutorial', 'learn', 'teach me', 'show me']):
        return "tutorial"
    
    # Question answering
    elif user_message.strip().endswith('?'):
        return "question"
    
    # Default to general
    else:
        return "general"

async def get_gemini_response(user_message: str) -> str:
    """Get contextually appropriate response from Gemini"""
    
    if not video_context.current_video:
        return "❌ No video detected. Please open a video page first."
    
    video_info = video_context.current_video
    intent = detect_intent(user_message)
    response_length = detect_response_length(user_message)
    include_timestamp = needs_timestamp_context(user_message)
    
    # Build basic video context (without timestamp unless needed)
    video_context_text = f"""
Current Video Context:
- Title: {video_info.get('title', 'Unknown')}
- Platform: {video_info.get('platform', 'Unknown')}
- Video duration: {format_time(video_info.get('duration', 0))}
- URL: {video_info.get('url', 'Unknown')}"""
    
    # Add timestamp context only when specifically requested
    if include_timestamp:
        current_time = video_info.get('currentTime', 0)
        video_context_text += f"""
- Current viewing position: {format_time(current_time)}"""

    # Build chat history context
    history_context = ""
    if video_context.chat_history:
        recent_history = video_context.chat_history[-3:]  # Last 3 exchanges
        history_context = "\n\nRecent conversation:\n"
        for i, entry in enumerate(recent_history, 1):
            history_context += f"Q{i}: {entry['user']}\nA{i}: {entry['assistant']}\n"
    
    # Response length guidelines
    length_instructions = {
        "detailed": """
RESPONSE STYLE: Provide a comprehensive and detailed response. Include:
- Thorough explanations with context
- Multiple paragraphs if needed
- Specific examples or steps
- Background information when relevant
- Be as helpful and informative as possible
""",
        "brief": """
RESPONSE STYLE: Keep response concise:
- 1-2 sentences maximum
- Direct and to the point
- Essential information only
""",
        "standard": """
RESPONSE STYLE: Provide a helpful, balanced response:
- 2-4 sentences typically
- Include key information without overwhelming
- Clear and informative
- Add context when it helps understanding
"""
    }
    
    # Intent-specific guidelines
    intent_instructions = {
        "summary": "Provide a clear summary of the video content, focusing on main topics and key messages.",
        "explanation": "Explain the concept or process clearly, using examples from the video when possible.",
        "timestamp": "The user is asking about something time-specific. Reference the current viewing position and what's happening at that moment in the video.",
        "keypoints": "Organize response as key points or bullet points when listing multiple items.",
        "tutorial": "Provide step-by-step guidance or instructions based on the video content.",
        "question": "Answer the specific question directly, providing context from the video.",
        "general": "Respond helpfully to the user's request using information from the video."
    }
    
    # Special timestamp instruction
    timestamp_instruction = ""
    if include_timestamp:
        timestamp_instruction = "\n- Reference the current viewing position when relevant\n- Use MM:SS or HH:MM:SS format for any timestamps mentioned"
    
    # Construct the full prompt
    full_prompt = f"""{video_context_text}
{history_context}

{length_instructions[response_length]}

INTENT CONTEXT: {intent_instructions[intent]}

INSTRUCTIONS:
- Base your response on the video context provided
- Be accurate and helpful
- Reference the video content when relevant{timestamp_instruction}
- Maintain a conversational and friendly tone
- Do NOT mention timestamps or current time unless the user specifically asks about timing

User's question: {user_message}

Response:"""
    
    try:
        response = model.generate_content(full_prompt)
        answer = response.text.strip()
        
        # Only apply length limits for brief responses
        if response_length == "brief" and len(answer) > 150:
            sentences = answer.split('. ')
            answer = sentences[0] + '.'
        
        return answer
        
    except Exception as e:
        return f"⚠️ Sorry, I encountered an error: {str(e)}"

def format_time(seconds: int) -> str:
    """Format seconds into MM:SS or HH:MM:SS format"""
    if seconds < 3600:  # Less than 1 hour
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    else:  # 1 hour or more
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

@app.get("/")
async def root():
    return {"message": "Video Chat Extension Backend is running!"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_connections": len(active_connections),
        "has_video_context": bool(video_context.current_video)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
