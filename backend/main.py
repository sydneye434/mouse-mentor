from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Mouse Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Placeholder: echo back until you add an LLM
    last = request.messages[-1] if request.messages else None
    if last and last.text.strip():
        reply = f"(Placeholder) You said: {last.text}"
    else:
        reply = "Ask me anything about planning your Disney trip—parks, hotels, dining, or dates."
    return ChatResponse(reply=reply)
