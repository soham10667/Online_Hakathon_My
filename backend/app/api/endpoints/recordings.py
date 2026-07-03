import os
import json
import uuid
import shutil
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import FileResponse
from app.api.deps import get_current_user

logger = logging.getLogger("recordings_endpoints")
router = APIRouter()

# Get storage path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "recordings")
DB_PATH = os.path.join(BASE_DIR, "storage", "recordings.json")

# Ensure storage directory exists
os.makedirs(STORAGE_DIR, exist_ok=True)
if not os.path.exists(DB_PATH):
    with open(DB_PATH, "w") as f:
        json.dump([], f)

def get_recordings() -> List[dict]:
    try:
        if os.path.exists(DB_PATH):
            with open(DB_PATH, "r") as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error reading recordings DB: {e}")
        return []

def save_recordings(recordings: List[dict]):
    try:
        with open(DB_PATH, "w") as f:
            json.dump(recordings, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to recordings DB: {e}")

@router.post("")
async def save_recording(
    request: Request,
    video: UploadFile = File(...),
    meetingId: str = Form(...),
    meetingTitle: str = Form(...),
    duration: str = Form(...),
    createdBy: Optional[str] = Form(None),
    accessCode: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    recordings = get_recordings()

    # Prevent duplicate recordings for the same meeting
    existing = next((r for r in recordings if r.get("meetingId") == meetingId), None)
    if existing:
        return existing

    recording_id = f"{int(datetime.utcnow().timestamp()*1000)}-{uuid.uuid4().hex[:9]}"
    file_name = f"{recording_id}.webm"
    file_path = os.path.join(STORAGE_DIR, file_name)

    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save recording file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Get file size
    file_size = 0
    if os.path.exists(file_path):
        file_size = os.path.getsize(file_path)

    # Build file URL using request.base_url for production support
    base_url = str(request.base_url)
    if base_url.endswith("/"):
        base_url = base_url[:-1]
    file_url = f"{base_url}/recordings/file/{file_name}"

    try:
        duration_num = int(duration)
    except ValueError:
        duration_num = 0

    user_name = createdBy or current_user.get("email", "User")

    recording = {
        "id": recording_id,
        "meetingId": meetingId,
        "meetingTitle": meetingTitle,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "duration": duration_num,
        "fileUrl": file_url,
        "fileName": file_name,
        "fileSize": file_size,
        "createdBy": user_name
    }
    if accessCode:
        recording["accessCode"] = accessCode

    recordings.insert(0, recording)
    save_recordings(recordings)

    return recording

@router.get("")
def get_all_recordings(current_user: dict = Depends(get_current_user)):
    return get_recordings()

@router.get("/file/{filename}")
def get_recording_file(filename: str):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording file not found")
    return FileResponse(file_path, media_type="video/webm")

@router.delete("/{id}")
def delete_recording(id: str, current_user: dict = Depends(get_current_user)):
    recordings = get_recordings()
    recording = next((r for r in recordings if r.get("id") == id), None)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Remove file from disk
    file_name = recording.get("fileName")
    if file_name:
        file_path = os.path.join(STORAGE_DIR, file_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete file {file_name}: {e}")

    recordings = [r for r in recordings if r.get("id") != id]
    save_recordings(recordings)
    return {"message": "Recording deleted successfully"}

@router.post("/{id}/access-code")
def set_access_code(
    id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    code = payload.get("code")
    recordings = get_recordings()
    for r in recordings:
        if r.get("id") == id:
            if code:
                r["accessCode"] = code
            else:
                r.pop("accessCode", None)
            save_recordings(recordings)
            return r
    raise HTTPException(status_code=404, detail="Recording not found")
