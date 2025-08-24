from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import json
import asyncio
from typing import Dict, List, Tuple
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

# Store active connections with their API keys and models
active_connections: Dict[WebSocket, Tuple[str, str]] = {}  # websocket -> (api_key, model)

class VideoContext:
    def __init__(self):
        self.current_video = {}
        self.chat_history = []

video_context = VideoContext()

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "config":
                # Store API key and model for this connection
                api_key = message["api_key"]
                model_name = message.get("model", "gemini-2.5-flash")  # Default to 2.5 Flash
                active_connections[websocket] = (api_key, model_name)
                
                await websocket.send_text(json.dumps({
                    "type": "status",
                    "message": f"Configuration updated - Using {model_name}"
                }))
                
            elif message["type"] == "video_update":
                # Update video context
                video_context.current_video = message["video_data"]
                await websocket.send_text(json.dumps({
                    "type": "status",
                    "message": "Video context updated"
                }))
                
            elif message["type"] == "chat":
                # Check if configuration exists
                if websocket not in active_connections:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "API key and model not configured"
                    }))
                    continue
                
                # Process chat message with Gemini
                user_message = message["message"]
                api_key, model_name = active_connections[websocket]
                response = await get_gemini_response(user_message, api_key, model_name)
                
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
        if websocket in active_connections:
            del active_connections[websocket]

def needs_timestamp_context(user_message: str) -> bool:
    """Check if user is asking for timestamp-related information"""
    message_lower = user_message.lower()
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
    
    detail_keywords = [
        'detailed', 'details', 'elaborate', 'explain in detail', 'more info',
        'comprehensive', 'thorough', 'step by step', 'breakdown', 'deep dive',
        'everything about', 'tell me more', 'expand on', 'fully explain',
        'complete explanation', 'in depth', 'extensively'
    ]
    
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

async def get_gemini_response(user_message: str, api_key: str, model_name: str) -> str:
    """Get response from Gemini with provided API key and model"""
    
    if not video_context.current_video:
        return "❌ No video detected. Please open a video page first."
    
    try:
        # Configure Gemini with the provided API key
        genai.configure(api_key=api_key)
        
        # Validate and use the specified model
        try:
            model = genai.GenerativeModel(model_name)
        except Exception as model_error:
            # Fallback to default model if specified model fails
            print(f"Model {model_name} failed, falling back to gemini-1.5-flash: {model_error}")
            model = genai.GenerativeModel('gemini-1.5-flash')
            model_name = 'gemini-1.5-flash'
        
        video_info = video_context.current_video
        response_length = detect_response_length(user_message)
        include_timestamp = needs_timestamp_context(user_message)
        
        # Build basic video context
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
            recent_history = video_context.chat_history[-3:]
            history_context = "\n\nRecent conversation:\n"
            for i, entry in enumerate(recent_history, 1):
                history_context += f"Q{i}: {entry['user']}\nA{i}: {entry['assistant']}\n"
        
        # Response length guidelines
        length_instructions = {
            "detailed": "Provide a comprehensive and detailed response with thorough explanations and examples.",
            "brief": "Keep response concise - 1-2 sentences maximum, direct and to the point.",
            "standard": "Provide a helpful, balanced response - 2-4 sentences typically, clear and informative."
        }
        
        # Model-specific instructions
        model_instructions = ""
        if "2.5" in model_name:
            model_instructions = "\n- You have enhanced thinking capabilities - use adaptive reasoning when helpful"
        elif "2.0" in model_name:
            model_instructions = "\n- You have next-gen multimodal capabilities and native tool use"
        elif "1.5" in model_name:
            model_instructions = "\n- You are a stable, proven model - provide reliable responses"
        
        # Construct the full prompt
        full_prompt = f"""{video_context_text}
{history_context}

RESPONSE STYLE: {length_instructions[response_length]}

INSTRUCTIONS:
- Base your response on the video context provided
- Be accurate and helpful
- Reference the video content when relevant
- Maintain a conversational and friendly tone
- Model: {model_name}{model_instructions}

User's question: {user_message}

Response:"""
        
        response = model.generate_content(full_prompt)
        answer = response.text.strip()
        
        # Only apply length limits for brief responses
        if response_length == "brief" and len(answer) > 150:
            sentences = answer.split('. ')
            answer = sentences[0] + '.'
        
        return answer
        
    except Exception as e:
        error_msg = str(e).lower()
        if "api_key" in error_msg or "authentication" in error_msg:
            return "❌ Invalid API key. Please check your Gemini API key in settings."
        elif "model" in error_msg or "not found" in error_msg:
            return f"❌ Model '{model_name}' is not available. Please try a different model in settings."
        elif "quota" in error_msg or "limit" in error_msg:
            return "❌ API quota exceeded. Please check your usage limits or try again later."
        elif "safety" in error_msg:
            return "❌ Response blocked by safety filters. Please rephrase your question."
        return f"⚠️ Error: {str(e)}"

def format_time(seconds: int) -> str:
    """Format seconds into MM:SS or HH:MM:SS format"""
    if seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

@app.get("/")
async def root():
    return {"message": "inSPECt - Video Chat Extension Backend is running!"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_connections": len(active_connections),
        "has_video_context": bool(video_context.current_video),
        "supported_models": [
            "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite",
            "gemini-2.0-flash", "gemini-2.0-flash-lite",
            "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
