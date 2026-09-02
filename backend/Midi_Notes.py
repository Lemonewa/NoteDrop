import math
import pretty_midi
import numpy
import wave
from io import BytesIO

Complete_Note = tuple[float, float, int, int, int]

def Midi_Parser(Midi_File):

    if (len(Midi_File) == 0):
        raise ValueError("Empty File")

    Midi = pretty_midi.PrettyMIDI(BytesIO(Midi_File))

    Complete_Notes = []

    for Track, Instrument in enumerate(Midi.instruments):
        for Note in Instrument.notes:
            if (Note.end > Note.start):
                Complete_Notes.append((Note.start, Note.end, Note.pitch, Note.velocity, Track))

    Complete_Notes.sort(key=lambda Note: (Note[0], Note[2]))

    return Complete_Notes

def Audio_To_Wav(Audio, Sample_Rate):

    Max = numpy.max(numpy.abs(Audio))
    if (Max > 0):
        Audio = Audio / Max * 0.95

    Audio_Int = numpy.int16(Audio * 32767)
    Wav_File = BytesIO()

    with wave.open(Wav_File, "wb") as Wav:
        Wav.setnchannels(1)
        Wav.setsampwidth(2)
        Wav.setframerate(Sample_Rate)
        Wav.writeframes(Audio_Int.tobytes())

    Wav_File.seek(0)
    return Wav_File.read()

def Synced_Wav(Midi_File, Duration, Tempo, Fall_Time, Render_Time):

    if (len(Midi_File) == 0):
        raise ValueError("Empty File")

    Sample_Rate = 44100
    Sample_Count = math.ceil(Render_Time * Sample_Rate)
    Midi = pretty_midi.PrettyMIDI(BytesIO(Midi_File))
    New_Midi = pretty_midi.PrettyMIDI()

    for Instrument in Midi.instruments:
        New_Instrument = pretty_midi.Instrument(program=Instrument.program, is_drum=Instrument.is_drum, name=Instrument.name)
        for Note in Instrument.notes:
            Start = (max(Note.start, 0) + Fall_Time) / Tempo
            End = (min(Note.end, Duration) + Fall_Time) / Tempo
            New_Note = pretty_midi.Note(velocity=Note.velocity, pitch=Note.pitch, start=Start, end=End)
            New_Instrument.notes.append(New_Note)
        New_Midi.instruments.append(New_Instrument)

    Audio = New_Midi.fluidsynth(fs=Sample_Rate)
    if (Audio.size < Sample_Count):
        Audio = numpy.pad(Audio, (0, Sample_Count - Audio.size))
    elif (Audio.size > Sample_Count):
        Audio = Audio[:Sample_Count]

    return (Audio_To_Wav(Audio, Sample_Rate))