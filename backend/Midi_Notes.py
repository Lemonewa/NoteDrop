import pretty_midi
from io import BytesIO

Complete_Note = tuple[float, float, int, int, int]

def Midi_Parser(Midi_File):

    if len(Midi_File) == 0:
        raise ValueError("Empty File")

    Midi = pretty_midi.PrettyMIDI(BytesIO(Midi_File))

    Complete_Notes = []

    for Track, Instrument in enumerate(Midi.instruments):
        for Note in Instrument.notes:
            if Note.end > Note.start:
                Complete_Notes.append((Note.start, Note.end, Note.pitch, Note.velocity, Track))

    Complete_Notes.sort(key=lambda Note: (Note[0], Note[2]))

    return Complete_Notes