"""
Minimal sync server for Bitcoin Mini Analytics Extension
Handles encrypted data sync - server cannot read Bitcoin addresses
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Bitcoin Mini Sync Server")

class SyncData(BaseModel):
    userId: str
    encryptedData: dict  # { encrypted: str, iv: str }
    timestamp: int

# In-memory storage (use database in production)
sync_storage = {}

@app.post("/api/sync")
async def sync_data(data: SyncData):
    """Store encrypted user data - server cannot decrypt it"""
    try:
        # Store encrypted data (we can't read it)
        sync_storage[data.userId] = {
            "encryptedData": data.encryptedData,
            "timestamp": data.timestamp,
            "lastSeen": data.timestamp
        }
        
        return {"success": True, "message": "Data synced successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@app.get("/api/sync/{user_id}")
async def get_sync_data(user_id: str):
    """Retrieve encrypted user data"""
    if user_id not in sync_storage:
        raise HTTPException(status_code=404, detail="No data found")
    
    return {
        "encryptedData": sync_storage[user_id]["encryptedData"],
        "timestamp": sync_storage[user_id]["timestamp"]
    }

@app.delete("/api/sync/{user_id}")
async def delete_sync_data(user_id: str):
    """Delete user's synced data"""
    if user_id in sync_storage:
        del sync_storage[user_id]
        return {"success": True, "message": "Data deleted"}
    else:
        raise HTTPException(status_code=404, detail="No data found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "users": len(sync_storage)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
