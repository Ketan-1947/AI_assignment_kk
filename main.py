from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from langchain_groq import ChatGroq
from langchain.memory import ConversationTokenBufferMemory
from langchain.schema import HumanMessage, AIMessage
from dotenv import load_dotenv
import os
import asyncio
from typing import Dict

load_dotenv()

app = FastAPI(title="Groq Chat Assistant")

# Store conversation memory per session
sessions: Dict[str, ConversationTokenBufferMemory] = {}

# Initialize Groq model globally (loaded once)
groq_api_key = os.getenv("GROQ_API_KEY")
llm = None

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    global llm
    print("🚀 Loading Groq model...")
    llm = ChatGroq(
        api_key=groq_api_key,
        model="llama-3.3-70b-versatile"
    )
    print("✅ Model loaded successfully!")

def get_or_create_memory(session_id: str) -> ConversationTokenBufferMemory:
    """Get existing memory or create new one for session"""
    if session_id not in sessions:
        sessions[session_id] = ConversationTokenBufferMemory(
            llm=llm,
            max_token_limit=130000,
            return_messages=True
        )
    return sessions[session_id]

async def ask_groq_async(question: str, session_id: str):
    """Async version of ask_groq with session management"""
    memory = get_or_create_memory(session_id)
    
    # Get message history from memory
    history = memory.chat_memory.messages
    
    # Build messages for Groq
    messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]
    for msg in history:
        if isinstance(msg, HumanMessage):
            messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            messages.append({"role": "assistant", "content": msg.content})
    messages.append({"role": "user", "content": question})
    
    # Call Groq model (LangChain's invoke is synchronous, run in executor)
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None, 
        lambda: llm.invoke(messages).content
    )

    # Update memory
    memory.chat_memory.add_message(HumanMessage(content=question))
    memory.chat_memory.add_message(AIMessage(content=response))

    return response

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    try:
        # Send initial greeting
        await websocket.send_json({
            "type": "system",
            "message": "Connected! I'm your personal assistant. How can I help you?"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            question = data.get("message", "")
            
            if not question:
                continue
            
            # Send typing indicator
            await websocket.send_json({
                "type": "typing",
                "message": ""
            })
            
            # Get response from Groq
            response = await ask_groq_async(question, session_id)
            
            # Send response back to client
            await websocket.send_json({
                "type": "response",
                "message": response
            })
            
    except WebSocketDisconnect:
        print(f"Client {session_id} disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "An error occurred. Please try again."
        })

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared"}
    return {"message": "Session not found"}

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    """Serve the main HTML page"""
    return FileResponse("static/index.html")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": llm is not None,
        "active_sessions": len(sessions)
    }
