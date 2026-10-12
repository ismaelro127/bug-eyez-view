# backend/api/main_api.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .news_routes import router as news_router

app = FastAPI(title="Bug Eyez View News API", version="1.0")

# Allow local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(news_router)

@app.get("/")
def root():
    return {"status": "ok", "message": "Bug Eyez View News API active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main_api:app", host="0.0.0.0", port=5000, reload=True)
