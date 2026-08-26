import asyncio
import json
import threading
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from .Midi_Notes import Midi_Parser
from .Video_Renderer import Render_Cancelled, Render_File_Name, Render_Video

App = FastAPI()
Render_Cancel = threading.Event()
Render_Lock = threading.Lock()

def Delete_File(File_Path: Path):
    File_Path.unlink(missing_ok=True)

def Renderr(Render_Data: dict, Midi_File: bytes):
    return Render_Video(Render_Data, Midi_File, Render_Cancel)

@App.post("/midi/notes")
async def Read_Midi(Input: UploadFile = File(..., alias="file")):

    File_Name = Input.filename or ""
    if (not File_Name.lower().endswith((".mid", ".midi"))):
        raise HTTPException(status_code=400, detail="Wrong File Format")

    try:
        Notes = Midi_Parser(await Input.read())
    except ValueError as Error:
        raise HTTPException(status_code=400, detail=str(Error)) from Error
    except Exception as Error:
        raise HTTPException(status_code=400, detail="Invalid MIDI File") from Error

    return {"Notes": Notes}

@App.post("/render/cancel")
async def Cancel_Render():
    Render_Cancel.set()
    return {"Cancelled": True}

@App.post("/render")
async def Render(Settings: str = Form(..., alias="settings"), Input: UploadFile = File(..., alias="file")):

    File_Name = Input.filename or ""
    if (not File_Name.lower().endswith((".mid", ".midi"))):
        raise HTTPException(status_code=400, detail="Wrong File Format")
    if (not Render_Lock.acquire(blocking=False)):
        raise HTTPException(status_code=409, detail="Render Already Running")
    Render_Cancel.clear()

    try:
        Render_Data = json.loads(Settings)
        Render_Data["File_Name"] = File_Name
        Video_Path = await asyncio.to_thread(Renderr, Render_Data, await Input.read())
    except json.JSONDecodeError as Error:
        raise HTTPException(status_code=400, detail="Invalid Render Data") from Error
    except Render_Cancelled as Error:
        raise HTTPException(status_code=499, detail=str(Error)) from Error
    except Exception as Error:
        raise HTTPException(status_code=500, detail="Render Failed") from Error
    finally:
        Render_Lock.release()

    return FileResponse(
        Video_Path,
        media_type="video/mp4",
        filename=Render_File_Name(File_Name),
        background=BackgroundTask(Delete_File, Video_Path),
    )