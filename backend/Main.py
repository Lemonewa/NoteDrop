from fastapi import FastAPI, File, HTTPException, UploadFile
from .Midi_Notes import Midi_Parser

App = FastAPI()

@App.post("/midi/notes")
async def Read_Midi(Input: UploadFile = File(..., alias="file")):

    File_Name = Input.filename or ""

    if not File_Name.lower().endswith((".mid", ".midi")):
        raise HTTPException(status_code=400, detail="Wrong File Format")

    try:
        Notes = Midi_Parser(await Input.read())
    except ValueError as Error:
        raise HTTPException(status_code=400, detail=str(Error)) from Error
    except Exception as Error:
        raise HTTPException(status_code=400, detail="Invalid MIDI File") from Error

    return {"Notes": Notes}