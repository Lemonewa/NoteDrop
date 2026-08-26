import math
import re
import struct
import subprocess
import time
from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw
from .Midi_Notes import Synced_Wav

Complete_Note = tuple[float, float, int, int, int]
RGB_Color = tuple[int, int, int]

Preview_Width = 960
Preview_Height = 720
Preview_Fall_Time = 4
Preview_Keyboard_Height = 100
Preview_Hit_Height = Preview_Height - Preview_Keyboard_Height
Preview_Min_Pitch = 21
Preview_Max_Pitch = 108
Preview_Pixels_Per_Second = Preview_Hit_Height / Preview_Fall_Time
Render_FPS = 60

class Render_Settings:
    File_Name: str
    Notes: list[Complete_Note]
    Left_White_Note_Color: RGB_Color
    Left_Black_Note_Color: RGB_Color
    Right_White_Note_Color: RGB_Color
    Right_Black_Note_Color: RGB_Color
    White_Key_Color: RGB_Color
    Black_Key_Color: RGB_Color
    Background_Type: str
    Solid_Color: RGB_Color
    Stripes_Color: RGB_Color
    Vertical_Line_Color: RGB_Color
    Horizontal_Line_Color: RGB_Color
    Vertical_Line_Thickness: float
    Horizontal_Line_Thickness: float
    Tempo: float
    Duration: float

class Render_Cancelled(Exception):
    pass

def Check_Cancel(Cancel_Event):
    if (Cancel_Event.is_set()):
        raise Render_Cancelled("Render Cancelled")

def Key_Color(Pitch):
    Pitch = Pitch % 12
    if (Pitch == 1 or Pitch == 3 or Pitch == 6 or Pitch == 8 or Pitch == 10):
        return 1
    return 0

Preview_White_Key_Pitches = []
Preview_Black_Key_Pitches = []

for iter in range(Preview_Min_Pitch, Preview_Max_Pitch + 1):
    if (Key_Color(iter)):
        Preview_Black_Key_Pitches.append(iter)
    else:
        Preview_White_Key_Pitches.append(iter)

Preview_White_Key_Width = Preview_Width / len(Preview_White_Key_Pitches)
Preview_Black_Key_Width = Preview_White_Key_Width * 0.62
Preview_Black_Key_Height = Preview_Keyboard_Height * 0.62

def White_Key_Index(Pitch):
    Count = 0
    for iter in range(Preview_Min_Pitch, Preview_Max_Pitch + 1):
        if (iter >= Pitch):
            break
        if (not Key_Color(iter)):
            Count += 1
    return Count

def Note_Position(Pitch):
    if (Key_Color(Pitch)):
        return (White_Key_Index(Pitch) * Preview_White_Key_Width) - (Preview_Black_Key_Width / 2)
    return (White_Key_Index(Pitch) * Preview_White_Key_Width)

def Note_Width(Pitch):
    if (Key_Color(Pitch)):
        return Preview_Black_Key_Width
    return Preview_White_Key_Width

def Average_Pitch(Notes, Track):
    Sum = 0
    Count = 0
    for iter in range(len(Notes)):
        if (Notes[iter][4] == Track):
            Sum += Notes[iter][2]
            Count += 1
    if (not Count):
        return 0
    return (Sum / Count)

def RGB(Color):
    Red = int(Color[1:3], 16)
    Green = int(Color[3:5], 16)
    Blue = int(Color[5:7], 16)
    return (Red, Green, Blue)

def Data_Color(Render_Data, Name, Default):
    return RGB(Render_Data.get(Name, Default))

def Data_Number(Render_Data, Name, Default):
    return float(Render_Data.get(Name, Default))

def Note_Parser(Render_Data):
    Notes = Render_Data.get("Notes")
    Complete_Notes = []
    for iter in range(len(Notes)):
        Note = Notes[iter]
        try:
            Start = float(Note[0])
            End = float(Note[1])
            Pitch = int(Note[2])
            Velocity = int(Note[3])
            Track = int(Note[4])
        except (TypeError, ValueError) as Error:
            raise ValueError("Invalid Notes") from Error    
        Complete_Notes.append((Start, End, Pitch, Velocity, Track))
    Complete_Notes.sort(key=lambda Note: (Note[0], Note[2]))
    return Complete_Notes

def Data_Parser(Render_Data):
    Tempo = Data_Number(Render_Data, "Tempo", 1)
    Notes = Note_Parser(Render_Data)
    Duration = 0
    for iter in range(len(Notes)):
        if (Notes[iter][1] > Duration):
            Duration = Notes[iter][1]
    Render_Time = (Duration + Preview_Fall_Time) / Tempo
    if (Render_Time > 600):
        raise ValueError("Render Is Too Long")
    Settings = Render_Settings()
    Settings.File_Name = str(Render_Data.get("File_Name", "No_Name"))
    Settings.Notes = Notes
    Settings.Left_White_Note_Color = Data_Color(Render_Data, "Left_White_Note_Color", "#1e88e5")
    Settings.Left_Black_Note_Color = Data_Color(Render_Data, "Left_Black_Note_Color", "#135894")
    Settings.Right_White_Note_Color = Data_Color(Render_Data, "Right_White_Note_Color", "#43a047")
    Settings.Right_Black_Note_Color = Data_Color(Render_Data, "Right_Black_Note_Color", "#2b6830")
    Settings.White_Key_Color = Data_Color(Render_Data, "White_Key_Color", "#ffffff")
    Settings.Black_Key_Color = Data_Color(Render_Data, "Black_Key_Color", "#000000")
    Settings.Background_Type = Render_Data.get("Background_Type", "Solid")
    Settings.Solid_Color = Data_Color(Render_Data, "Solid_Color", "#444444")
    Settings.Stripes_Color = Data_Color(Render_Data, "Stripes_Color", "#444444")
    Settings.Vertical_Line_Color = Data_Color(Render_Data, "Vertical_Line_Color", "#ffffff")
    Settings.Horizontal_Line_Color = Data_Color(Render_Data, "Horizontal_Line_Color", "#ffffff")
    Settings.Vertical_Line_Thickness = Data_Number(Render_Data, "Vertical_Line_Thickness", 0.25)
    Settings.Horizontal_Line_Thickness = Data_Number(Render_Data, "Horizontal_Line_Thickness", 0.25)
    Settings.Tempo = Tempo
    Settings.Duration = Duration
    return Settings

def Background(Settings):
    if (Settings.Background_Type == "Solid"):
        Background_Image = Image.new("RGB", (Preview_Width, Preview_Height), Settings.Solid_Color)
    else:
        Background_Image = Image.new("RGB", (Preview_Width, Preview_Height), Settings.Stripes_Color)
    Draw = ImageDraw.Draw(Background_Image)
    if (Settings.Background_Type == "Vertical_Stripes" or Settings.Background_Type == "Grid"):
        for iter in range(len(Preview_White_Key_Pitches) + 1):
            x = iter * Preview_White_Key_Width
            Draw.line([(x, 0), (x, Preview_Hit_Height)], fill=Settings.Vertical_Line_Color, width=Settings.Vertical_Line_Thickness)
    if (Settings.Background_Type == "Horizontal_Stripes" or Settings.Background_Type == "Grid"):
        Line_Count = math.ceil(Preview_Hit_Height / Preview_White_Key_Width)
        for iter in range(Line_Count + 1):
            y = iter * Preview_White_Key_Width
            Draw.line([(0, y), (Preview_Width, y)], fill=Settings.Horizontal_Line_Color, width=Settings.Horizontal_Line_Thickness)
    return Background_Image

def Tracks(Notes):
    Tracks = []
    for iter in range(len(Notes)):
        if (Notes[iter][4] not in Tracks):
            Tracks.append(Notes[iter][4])
    return Tracks

def Left_Hand(Notes, Tracks):
    if (len(Tracks) == 2):
        if (Average_Pitch(Notes, Tracks[0]) <= Average_Pitch(Notes, Tracks[1])):
            return Tracks[0]
        return Tracks[1]
    return None

def Track_Average_Pitches(Notes, Tracks):
    Average_Pitches = {}
    for iter in range(len(Tracks)):
        Average_Pitches[Tracks[iter]] = Average_Pitch(Notes, Tracks[iter])
    return Average_Pitches

def Is_Left_Hand(Note, Left_Track, Track_Average_Pitches, Track_Count):
    if (Track_Count == 2):
        return (Note[4] == Left_Track)
    return (Track_Average_Pitches.get(Note[4]) < 60)

def Note_Color(Note, Settings, Left_Track, Track_Average_Pitches, Track_Count):
    Left_Hand = Is_Left_Hand(Note, Left_Track, Track_Average_Pitches, Track_Count)
    Black_Key = Key_Color(Note[2])
    if (Left_Hand and not Black_Key):
        return Settings.Left_White_Note_Color
    if (Left_Hand):
        return Settings.Left_Black_Note_Color
    if (not Black_Key):
        return Settings.Right_White_Note_Color
    return Settings.Right_Black_Note_Color

def Draw_Note(Draw, Note, Current_Time, Settings, Left_Track, Track_Average_Pitches, Track_Count):
    Height = max((min(Note[1], Settings.Duration) - Note[0]) * Preview_Pixels_Per_Second, 4)
    Bottom = Preview_Hit_Height - (Note[0] - Current_Time) * Preview_Pixels_Per_Second
    x = Note_Position(Note[2])
    Draw.rounded_rectangle([x, Bottom - Height, x + Note_Width(Note[2]), Bottom], radius=2, fill=Note_Color(Note, Settings, Left_Track, Track_Average_Pitches, Track_Count))

def Draw_Frame(Current_Time, Settings, Left_Track, Track_Average_Pitches, Track_Count, Background, Preview_Notes):
    Frame = Background.copy()
    Draw = ImageDraw.Draw(Frame)
    Active_Key_Colors = {}
    for iter in range(len(Preview_Notes)):
        Note = Preview_Notes[iter]
        if (Note[0] <= Current_Time + Preview_Fall_Time and Note[1] >= Current_Time):
            Draw_Note(Draw, Note, Current_Time, Settings, Left_Track, Track_Average_Pitches, Track_Count)
        if (Current_Time >= Note[0] and Current_Time <= Note[1]):
            Active_Key_Colors[Note[2]] = Note_Color(Note, Settings, Left_Track, Track_Average_Pitches, Track_Count)
    for iter in range(len(Preview_White_Key_Pitches)):
        x = iter * Preview_White_Key_Width
        Draw.rectangle(
            [x, Preview_Hit_Height, x + Preview_White_Key_Width, Preview_Height],
            fill=Active_Key_Colors.get(Preview_White_Key_Pitches[iter]) or Settings.White_Key_Color,
            outline=(154, 154, 154),
            width=1,
        )
    for iter in range(len(Preview_Black_Key_Pitches)):
        x = Note_Position(Preview_Black_Key_Pitches[iter])
        Draw.rectangle(
            [x, Preview_Hit_Height, x + Preview_Black_Key_Width, Preview_Hit_Height + Preview_Black_Key_Height],
            fill=Active_Key_Colors.get(Preview_Black_Key_Pitches[iter]) or Settings.Black_Key_Color,
            outline=(0, 0, 0),
            width=1,
        )
    return Frame

def Avi_Block(Name, Data):
    Padding = b""
    if (len(Data) % 2):
        Padding = b"\0"
    return (Name + struct.pack("<I", len(Data)) + Data + Padding)

def Avi_Blocks(Name, Data):
    return (b"LIST" + struct.pack("<I", len(Data) + 4) + Name + Data)

def Avi_Data(Frame_Count):
    Microseconds_Per_Frame = round(1_000_000 / Render_FPS)
    Buffer_Size = Preview_Width * Preview_Height * 3
    Bytes_Per_Second = Buffer_Size * Render_FPS
    Main_Header = struct.pack(
        "<14I",
        Microseconds_Per_Frame,
        Bytes_Per_Second,
        0,
        0x10,
        Frame_Count,
        0,
        1,
        Buffer_Size,
        Preview_Width,
        Preview_Height,
        0,
        0,
        0,
        0,
    )
    Stream_Header = struct.pack(
        "<4s4sIHHIIIIIIIIhhhh",
        b"vids",
        b"MJPG",
        0,
        0,
        0,
        0,
        1,
        Render_FPS,
        0,
        Frame_Count,
        Buffer_Size,
        0xFFFFFFFF,
        0,
        0,
        0,
        Preview_Width,
        Preview_Height,
    )
    Stream_Format = struct.pack(
        "<IiiHH4sIiiII",
        40,
        Preview_Width,
        Preview_Height,
        1,
        24,
        b"MJPG",
        Buffer_Size,
        0,
        0,
        0,
        0,
    )
    Stream_List = Avi_Blocks(b"strl", Avi_Block(b"strh", Stream_Header) + Avi_Block(b"strf", Stream_Format))
    return Avi_Blocks(b"hdrl", Avi_Block(b"avih", Main_Header) + Stream_List)

def Jpeg_Data(Frame):
    Buffer = BytesIO()
    Frame.save(Buffer, format="JPEG", quality=85)
    return Buffer.getvalue()

def Create_Avi(Settings, Output_Path, Cancel_Event):
    Check_Cancel(Cancel_Event)
    Image_Background = Background(Settings)
    Track_List = Tracks(Settings.Notes)
    Left_Track = Left_Hand(Settings.Notes, Track_List)
    Track_Average_Pitchess = Track_Average_Pitches(Settings.Notes, Track_List)
    Track_Count = len(Track_List)
    Render_Time = (Settings.Duration + Preview_Fall_Time) / Settings.Tempo
    Frame_Count = math.ceil(Render_Time * Render_FPS)
    Frames = []
    with Output_Path.open("wb") as Output:
        Output.write(b"RIFF")
        Riff = Output.tell()
        Output.write(struct.pack("<I", 0))
        Output.write(b"AVI ")
        Output.write(Avi_Data(Frame_Count))
        Output.write(b"LIST")
        Movi = Output.tell()
        Output.write(struct.pack("<I", 0))
        Output.write(b"movi")
        Movi_Start = Output.tell()
        for iter in range(Frame_Count):
            Check_Cancel(Cancel_Event)
            Current_Time = (iter / Render_FPS) * Settings.Tempo - Preview_Fall_Time
            Frame = Draw_Frame(Current_Time, Settings, Left_Track, Track_Average_Pitchess, Track_Count, Image_Background, Settings.Notes)
            Frame_Data = Jpeg_Data(Frame)
            Block_Start = Output.tell()
            Output.write(b"00dc")
            Output.write(struct.pack("<I", len(Frame_Data)))
            Output.write(Frame_Data)
            if (len(Frame_Data) % 2):
                Output.write(b"\0")
            Frames.append((Block_Start - Movi_Start, len(Frame_Data)))
        Movi_End = Output.tell()
        Output.seek(Movi)
        Output.write(struct.pack("<I", Movi_End - Movi - 4))
        Output.seek(Movi_End)
        Index_Data = bytearray()
        for Offset, Size in Frames:
            Index_Data += struct.pack("<4sIII", b"00dc", 0x10, Offset, Size)
        Output.write(Avi_Block(b"idx1", bytes(Index_Data)))
        File_End = Output.tell()
        Output.seek(Riff)
        Output.write(struct.pack("<I", File_End - 8))

def Run_FFmpeg(Video_Path, Audio_Path, Output_Path, Cancel_Event):
    Command = [
        "ffmpeg",
        "-y",
        "-i", str(Video_Path),
        "-i", str(Audio_Path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-profile:v", "baseline",
        "-level", "3.2",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        str(Output_Path),
    ]
    Process = subprocess.Popen(Command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    while (Process.poll() is None):
        if (Cancel_Event.is_set()):
            Process.terminate()
            try:
                Process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                Process.kill()
                Process.wait()
            raise Render_Cancelled("Render Cancelled")
        time.sleep(0.1)
    if (Process.returncode != 0):
        raise RuntimeError("FFmpeg Failed")

def Render_Time(Settings):
    Renderr_Time = (Settings.Duration + Preview_Fall_Time) / Settings.Tempo
    Frame_Count = math.ceil(Renderr_Time * Render_FPS)
    return (Frame_Count / Render_FPS)

def Render_Video(Render_Data, Midi_File, Cancel_Event):
    Settings = Data_Parser(Render_Data)
    Video_File = NamedTemporaryFile(delete=False, suffix=".avi")
    Audio_File = NamedTemporaryFile(delete=False, suffix=".wav")
    Output_File = NamedTemporaryFile(delete=False, suffix=".mp4")
    Video_Path = Path(Video_File.name)
    Audio_Path = Path(Audio_File.name)
    Output_Path = Path(Output_File.name)
    Video_File.close()
    Audio_File.close()
    Output_File.close()
    try:
        Check_Cancel(Cancel_Event)
        Create_Avi(Settings, Video_Path, Cancel_Event)
        Check_Cancel(Cancel_Event)
        Audio_Path.write_bytes(Synced_Wav(Midi_File, Settings.Duration, Settings.Tempo, Preview_Fall_Time, Render_Time(Settings)))
        Check_Cancel(Cancel_Event)
        Run_FFmpeg(Video_Path, Audio_Path, Output_Path, Cancel_Event)
        Check_Cancel(Cancel_Event)
    except Exception:
        Video_Path.unlink(missing_ok=True)
        Audio_Path.unlink(missing_ok=True)
        Output_Path.unlink(missing_ok=True)
        raise
    Video_Path.unlink(missing_ok=True)
    Audio_Path.unlink(missing_ok=True)
    return Output_Path

def Render_File_Name(File_Name):
    Name = Path(File_Name).stem or "NoteDrop"
    Name = re.sub(r"[^A-Za-z0-9_-]+", "_", Name)
    return (f"{Name}_NoteDrop.mp4")