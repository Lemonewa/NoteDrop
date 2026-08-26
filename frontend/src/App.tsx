import { ChangeEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import * as PL from './Piano_Logic'
import * as VS from './Visual_Settings'

type Complete_Note = [number, number, number, number, number]
type Color_Setter = ((Color: string) => void)
type Number_Setter = ((Number: number) => void)

function Average_Pitch(Notes: Complete_Note[], Track: number) {
  let Sum = 0
  let Count = 0
  for (let iter = 0; iter < Notes.length; iter += 1) {
    if (Notes[iter][4] === Track) {
      Sum += Notes[iter][2]
      Count += 1
    }
  }
  if (!Count) {
    return 0
  }
  return (Sum / Count)
}

function Note_Frequency(Pitch: number) {
  return (440 * Math.pow(2, (Pitch - 69) / 12))
}

function Color_Boxes(Colors: string[], Set_Color: Color_Setter) {
  const Buttons = []
  for (let iter = 0; iter < Colors.length; iter += 1) {
    Buttons.push(
      <button
        key={iter}
        type="button"
        className="Color_Box"
        style={{backgroundColor: Colors[iter]}}
        onClick={() => Set_Color(Colors[iter])}
      />
    )
  }
  return (
    <div className="Color_Boxes">
      {Buttons}
    </div>
  )
}

function Basic_Color_Row(Title: string, Colors: string[], Color: string, Set_Color: Color_Setter) {
  return (
    <div className="Color_Row">
      <div className="Color_Title">{Title}</div>
      {Color_Boxes(Colors, Set_Color)}
      <input
        className="Color_Input"
        type="color"
        value={Color}
        onChange={(Input) => Set_Color(Input.target.value)}
      />
    </div>
  )
}

function Auto_Color_Row(Title: string, Color: string, Auto: boolean, Set_Color: Color_Setter, Set_Auto_Color: (() => void)) {
  let Auto_Color = (Auto ? 'Auto_Color_Inactive' : 'Auto_Color_Active')
  return (
    <div className="Color_Row">
      <div className="Color_Title">{Title}</div>
      {Color_Boxes(VS.Basic_Note_Colors, Set_Color)}
      <div className="Color_Custom">
        <button
          type="button"
          className={Auto_Color}
          onClick={Set_Auto_Color}
        >
          AUTO
        </button>
        <input
          className="Color_Input"
          type="color"
          value={Color}
          onChange={(Input) => Set_Color(Input.target.value)}
        />
      </div>
    </div>
  )
}

function Line_Row(Title: string, Thickness: number, Color: string, Set_Thickness: Number_Setter, Set_Color: Color_Setter) {
  const Thicknesses = []
  for (let iter = 0; iter < VS.Preview_Line_Thickness_Options.length; iter += 1) {
    Thicknesses.push( <option key={iter} value={VS.Preview_Line_Thickness_Options[iter]}>{VS.Preview_Line_Thickness_Options[iter]}px</option> )
  }
  return (
    <div className="Color_Row">
      <div className="Color_Title">{Title}</div>
      {Color_Boxes(VS.Basic_Line_Colors, Set_Color)}
      <div className="Color_Custom">
        <select
          className="Line_Thickness"
          value={Thickness}
          onChange={(Input) => Set_Thickness(Number(Input.target.value))}
        >
          {Thicknesses}
        </select>
        <input
          className="Color_Input"
          type="color"
          value={Color}
          onChange={(Input) => Set_Color(Input.target.value)}
        />
      </div>
    </div>
  )
}

function App() {

  const [Help, Set_Help] = useState(false)
  const [File_Name, Set_File_Name] = useState('')
  const [Notes, Set_Notes] = useState<Complete_Note[]>([])
  const [Current_Time, Set_Current_Time] = useState(-PL.Preview_Fall_Time)
  const [Left_White_Note_Color, Set_Left_White_Note_Color] = useState(VS.Default_Left_White_Note_Color)
  const [Left_Black_Note_Color, Set_Left_Black_Note_Color] = useState(VS.Dark_Color(VS.Default_Left_White_Note_Color))
  const [Left_Black_Note_Color_Auto, Set_Left_Black_Note_Color_Auto] = useState(true)
  const [Right_White_Note_Color, Set_Right_White_Note_Color] = useState(VS.Default_Right_White_Note_Color)
  const [Right_Black_Note_Color, Set_Right_Black_Note_Color] = useState(VS.Dark_Color(VS.Default_Right_White_Note_Color))
  const [Right_Black_Note_Color_Auto, Set_Right_Black_Note_Color_Auto] = useState(true)
  const [White_Key_Color, Set_White_Key_Color] = useState(VS.Default_White_Key_Color)
  const [Black_Key_Color, Set_Black_Key_Color] = useState(VS.Default_Black_Key_Color)
  const [Background_Type, Set_Background_Type] = useState<VS.Background_Type>('Solid')
  const [Solid_Color, Set_Solid_Color] = useState(VS.Default_Background_Color)
  const [Stripes_Color, Set_Stripes_Color] = useState(VS.Default_Background_Color)
  const [Vertical_Line_Color, Set_Vertical_Line_Color] = useState(VS.Default_Line_Color)
  const [Horizontal_Line_Color, Set_Horizontal_Line_Color] = useState(VS.Default_Line_Color)
  const [Vertical_Line_Thickness, Set_Vertical_Line_Thickness] = useState(VS.Default_Line_Thickness)
  const [Horizontal_Line_Thickness, Set_Horizontal_Line_Thickness] = useState(VS.Default_Line_Thickness)
  const [Tempo, Set_Tempo] = useState(VS.Default_Tempo)
  const [Duration, Set_Duration] = useState(VS.Default_Duration)
  const [Error_Message, Set_Error_Message] = useState('')
  const [Rendering, Set_Rendering] = useState(false)
  const [Mute, Set_Mute] = useState(false)
  const [Midi_File, Set_Midi_File] = useState<File | undefined>(undefined)
  
  const Error_Timeout = useRef<number | undefined>(undefined)
  const Frame = useRef<number | undefined>(undefined)
  const Render_Controller = useRef<AbortController | undefined>(undefined)
  const Audio_Context = useRef<AudioContext | undefined>(undefined)
  const Preview_Sounds = useRef<OscillatorNode[]>([])
  const Muted = useRef(false)
  
  const Preview_Notes: Complete_Note[] = []
  const Tracks: number[] = []
  for (let iter = 0; iter < Notes.length; iter += 1) {
    if (Notes[iter][0] < Duration) {
      Preview_Notes.push(Notes[iter])
    }
    if (!Tracks.includes(Notes[iter][4])) {
      Tracks.push(Notes[iter][4])
    }
  }
  const Left_Track = (((Tracks.length === 2) && (Average_Pitch(Notes, Tracks[0]) <= Average_Pitch(Notes, Tracks[1]))) ? Tracks[0] : Tracks[1])
  const Track_Average_Pitches = new Map<number, number>()
  for (let iter = 0; iter < Tracks.length; iter += 1) {
    Track_Average_Pitches.set(Tracks[iter], Average_Pitch(Notes, Tracks[iter]))
  }

  let Preview_Background_Fill = ''
  if (Background_Type === 'Solid') {
    Preview_Background_Fill = Solid_Color
  }
  else {
    Preview_Background_Fill = Stripes_Color
  }

  const Show_Vertical_Lines = (Background_Type === 'Vertical_Stripes' || Background_Type === 'Grid')
  const Show_Horizontal_Lines = (Background_Type === 'Horizontal_Stripes' || Background_Type === 'Grid')
  const Line_Distance = PL.Preview_White_Key_Width
  const Vertical_Lines: number[] = []
  for (let iter = 0; iter <= PL.Preview_White_Key_Pitches.length; iter += 1) {
    Vertical_Lines.push(iter * Line_Distance)
  }
  const Horizontal_Lines: number[] = []
  const Horizontal_Line_Count = Math.ceil(PL.Preview_Hit_Height / Line_Distance)
  for (let iter = 0; iter <= Horizontal_Line_Count; iter += 1) {
    Horizontal_Lines.push(iter * Line_Distance)
  }

  let View = ''

  if (File_Name === '' && !Help) {
    View = 'View-0'
  }
  else if (File_Name === '') {
    View = 'View-1'
  }
  else if (!Help) {
    View = 'View-2'
  }
  else {
    View = 'View-3'
  }

  function Play_Preview_Sound(Note: Complete_Note) {
    if (Muted.current || Audio_Context.current === undefined) {
      return
    }
    const Start_Time = Audio_Context.current.currentTime
    const Note_End = Math.min(Note[1], Duration)
    let Sound_Duration = (Note_End - Note[0]) / Tempo
    let Volume = (Note[3] / 127) * 0.04
    const End_Time = Start_Time + Sound_Duration
    const Oscillator = Audio_Context.current.createOscillator()
    const Gain = Audio_Context.current.createGain()
    Oscillator.type = 'sine'
    Oscillator.frequency.setValueAtTime(Note_Frequency(Note[2]), Start_Time)
    Gain.gain.setValueAtTime(0, Start_Time)
    Gain.gain.linearRampToValueAtTime(Volume, Start_Time + 0.01)
    Gain.gain.linearRampToValueAtTime(0, End_Time)
    Oscillator.connect(Gain)
    Gain.connect(Audio_Context.current.destination)
    Oscillator.onended = () => Remove_Preview_Sound(Oscillator)
    Preview_Sounds.current.push(Oscillator)
    Oscillator.start(Start_Time)
    Oscillator.stop(End_Time)
  }

  function Play_Preview_Sounds(Previous_Time: number, Next_Time: number) {
    if (Muted.current || Next_Time < Previous_Time || Next_Time < 0) {
      return
    }
    for (let iter = 0; iter < Preview_Notes.length; iter += 1) {
      if ((Preview_Notes[iter][0] > Previous_Time) && (Preview_Notes[iter][0] <= Next_Time) && (Preview_Notes[iter][0] < Duration)) {
        Play_Preview_Sound(Preview_Notes[iter])
      }
    }
  }

  function Stop_Preview_Sounds() {
    for (let iter = 0; iter < Preview_Sounds.current.length; iter += 1) {
      Preview_Sounds.current[iter].stop()
    }
    Preview_Sounds.current = []
  }

  useEffect(() => {

    if (Notes.length === 0) {
      Stop_Preview_Sounds()
      Set_Current_Time(-PL.Preview_Fall_Time)
      return
    }

    const Start_Time = performance.now()
    let Previous_Time = -PL.Preview_Fall_Time
    function Animate(Now: number) {
      const Loop_Time = (((((Now - Start_Time) / 1000) * Tempo) % (Duration + PL.Preview_Fall_Time)) - PL.Preview_Fall_Time)
      if (Loop_Time < Previous_Time) {
        Stop_Preview_Sounds()
      }
      Play_Preview_Sounds(Previous_Time, Loop_Time)
      Previous_Time = Loop_Time
      Set_Current_Time(Loop_Time)
      Frame.current = window.requestAnimationFrame(Animate)
    }

    Frame.current = window.requestAnimationFrame(Animate)

    return (() => {
      if (Frame.current !== undefined) {
        window.cancelAnimationFrame(Frame.current)
      }
      Stop_Preview_Sounds()
    })

  }, [Notes, Duration, Tempo])

  useEffect(() => {
    Muted.current = Mute
    if (Mute) {
      Stop_Preview_Sounds()
    }
  }, [Mute])

  function Show_Error(Message: string) {
    Set_Error_Message(Message)
    if (Error_Timeout.current !== undefined) {
      window.clearTimeout(Error_Timeout.current)
    }
    Error_Timeout.current = window.setTimeout(() => Set_Error_Message(''), 5000)
  }

  function Start_Preview_Audio() {
    if (Audio_Context.current === undefined) {
      Audio_Context.current = new AudioContext()
    }
    Audio_Context.current.resume()
  }

  function Remove_Preview_Sound(Sound: OscillatorNode) {
    const Sounds = []
    for (let iter = 0; iter < Preview_Sounds.current.length; iter += 1) {
      if (Preview_Sounds.current[iter] !== Sound) {
        Sounds.push(Preview_Sounds.current[iter])
      }
    }
    Preview_Sounds.current = Sounds
  }

  function Change_Mute() {
    if (Mute) {
      Start_Preview_Audio()
      Set_Mute(false)
    }
    else {
      Stop_Preview_Sounds()
      Set_Mute(true)
    }
  }

  function Change_Left_White_Note_Color(Color: string) {
    Set_Left_White_Note_Color(Color)
    if (Left_Black_Note_Color_Auto) {
      Set_Left_Black_Note_Color(VS.Dark_Color(Color))
    }
  }

  function Change_Left_Black_Note_Color(Color: string) {
    Set_Left_Black_Note_Color(Color)
    Set_Left_Black_Note_Color_Auto(false)
  }

  function Auto_Left_Black_Note_Color() {
    Set_Left_Black_Note_Color(VS.Dark_Color(Left_White_Note_Color))
    Set_Left_Black_Note_Color_Auto(true)
  }

  function Change_Right_White_Note_Color(Color: string) {
    Set_Right_White_Note_Color(Color)
    if (Right_Black_Note_Color_Auto) {
      Set_Right_Black_Note_Color(VS.Dark_Color(Color))
    }
  }

  function Change_Right_Black_Note_Color(Color: string) {
    Set_Right_Black_Note_Color(Color)
    Set_Right_Black_Note_Color_Auto(false)
  }

  function Auto_Right_Black_Note_Color() {
    Set_Right_Black_Note_Color(VS.Dark_Color(Right_White_Note_Color))
    Set_Right_Black_Note_Color_Auto(true)
  }

  function Reset_File(Input: HTMLInputElement) {
    Stop_Preview_Sounds()
    Set_File_Name('')
    Set_Notes([])
    Set_Midi_File(undefined)
    Input.value = ''
  }

  async function Upload_File(Input: ChangeEvent<HTMLInputElement>) {
    
    const File = Input.target.files?.[0]
    if (!File) {
      return
    }
    Stop_Preview_Sounds()
    Start_Preview_Audio()

    const Upload = new FormData()
    Upload.append('file', File)
    const Response = await fetch('/midi/notes', { method: 'POST', body: Upload })
    const Data = await Response.json()

    if (!Response.ok) {
      Reset_File(Input.target)
      Show_Error(Data.detail || `File Upload Failed (${Response.status})`)
      return
    }

    Set_Notes(Data.Notes)
    Set_File_Name(File.name)
    Set_Error_Message('')
    Set_Rendering(false)
    Set_Midi_File(File)

  }

  async function Render() {

    if (Midi_File === undefined) {
      Show_Error('No MIDI File')
      return
    }

    if (Rendering) {
      return
    }

    const Controller = new AbortController()
    Render_Controller.current = Controller
    Set_Rendering(true)

    const Render_Data = {
      File_Name: File_Name,
      Notes: Notes,
      Left_White_Note_Color: Left_White_Note_Color,
      Left_Black_Note_Color: Left_Black_Note_Color,
      Right_White_Note_Color: Right_White_Note_Color,
      Right_Black_Note_Color: Right_Black_Note_Color,
      White_Key_Color: White_Key_Color,
      Black_Key_Color: Black_Key_Color,
      Background_Type: Background_Type,
      Solid_Color: Solid_Color,
      Stripes_Color: Stripes_Color,
      Vertical_Line_Color: Vertical_Line_Color,
      Horizontal_Line_Color: Horizontal_Line_Color,
      Vertical_Line_Thickness: Vertical_Line_Thickness,
      Horizontal_Line_Thickness: Horizontal_Line_Thickness,
      Tempo: Tempo,
      Duration: Duration
    }
    const Render_Request = new FormData()
    Render_Request.append('settings', JSON.stringify(Render_Data))
    Render_Request.append('file', Midi_File)

    const Response = await fetch('/render', {
      method: 'POST',
      body: Render_Request,
      signal: Controller.signal
    })

    if (!Response.ok) {
      const Data = await Response.json()
      Show_Error(Data.detail || `Render Failed (${Response.status})`)
      return
    }

    const Video = await Response.blob()
    const Download_Url = window.URL.createObjectURL(Video)
    const Download_Link = document.createElement('a')
    const Download_Name = File_Name.replace(/\.[^/.]+$/, '') || 'NoteDrop'
    Download_Link.href = Download_Url
    Download_Link.download = `${Download_Name}_NoteDrop.mp4`
    document.body.appendChild(Download_Link)
    Download_Link.click()
    Download_Link.remove()
    window.URL.revokeObjectURL(Download_Url)

    if (Render_Controller.current === Controller) {
      Render_Controller.current = undefined
    }
    Set_Rendering(false)

  }

  function Cancel_Render() {
    fetch('/render/cancel', { method: 'POST' }).catch(() => {})
    if (Render_Controller.current !== undefined) {
      Render_Controller.current.abort()
      Render_Controller.current = undefined
    }
    Set_Rendering(false)
  }

  function Is_Left_Hand(Note: Complete_Note) {
    if (Tracks.length === 2) {
      return (Note[4] === Left_Track)
    }
    const Average = Track_Average_Pitches.get(Note[4])
    if (Average === undefined) {
      return (Note[2] < 60)
    }
    return (Average < 60)
  }

  function Note_Color(Note: Complete_Note) {
    const Left_Hand = Is_Left_Hand(Note)
    const Black_Key = PL.Key_Color(Note[2])
    if (Left_Hand && !Black_Key) {
      return Left_White_Note_Color
    }
    if (Left_Hand) {
      return Left_Black_Note_Color
    }
    if (!Black_Key) {
      return Right_White_Note_Color
    }
    return Right_Black_Note_Color 
  }

  function Active_Key_Color(Pitch: number) {
    let Color = ''
    for (let iter = 0; iter < Preview_Notes.length; iter += 1) {
      if ((Preview_Notes[iter][2] === Pitch) && (Current_Time >= Preview_Notes[iter][0]) && (Current_Time <= Preview_Notes[iter][1])) {
        Color = Note_Color(Preview_Notes[iter])
      }
    }
    return Color
  }

  function Draw_Note(Note: Complete_Note, Index: number) {
    
    const Height = Math.max((Math.min(Note[1], Duration) - Note[0]) * PL.Preview_Pixels_Per_Second, 4)
    const Bottom = PL.Preview_Hit_Height - (Note[0] - Current_Time) * PL.Preview_Pixels_Per_Second

    return (
      <rect
        key={Index}
        className="Preview_Note"
        fill={Note_Color(Note)}
        x={PL.Note_Position(Note[2])}
        y={Bottom - Height}
        width={PL.Note_Width(Note[2])}
        height={Height}
        rx="2"
      />
    )

  }

  const Vertical_Line = []
  if (Show_Vertical_Lines) {
    for (let iter = 0; iter < Vertical_Lines.length; iter += 1) {
      Vertical_Line.push(
        <line
          key={iter}
          x1={Vertical_Lines[iter]}
          y1="0"
          x2={Vertical_Lines[iter]}
          y2={PL.Preview_Hit_Height}
          stroke={Vertical_Line_Color}
          strokeWidth={Vertical_Line_Thickness}
        />
      )
    }
  }

  const Horizontal_Line = []
  if (Show_Horizontal_Lines) {
    for (let iter = 0; iter < Horizontal_Lines.length; iter += 1) {
      Horizontal_Line.push(
        <line
          key={iter}
          x1="0"
          y1={Horizontal_Lines[iter]}
          x2={PL.Preview_Width}
          y2={Horizontal_Lines[iter]}
          stroke={Horizontal_Line_Color}
          strokeWidth={Horizontal_Line_Thickness}
        />
      )
    }
  }

  const Note = []
  for (let iter = 0; iter < Preview_Notes.length; iter += 1) {
    Note.push(Draw_Note(Preview_Notes[iter], iter))
  }

  const White_Key = []
  for (let iter = 0; iter < PL.Preview_White_Key_Pitches.length; iter += 1) {
    const Pitch = PL.Preview_White_Key_Pitches[iter]
    White_Key.push(
      <rect
        key={iter}
        className="Preview_Key_White"
        fill={Active_Key_Color(Pitch) || White_Key_Color}
        x={iter * PL.Preview_White_Key_Width}
        y={PL.Preview_Hit_Height}
        width={PL.Preview_White_Key_Width}
        height={PL.Preview_Keyboard_Height}
      />
    )
  }

  const Black_Key = []
  for (let iter = 0; iter < PL.Preview_Black_Key_Pitches.length; iter += 1) {
    const Pitch = PL.Preview_Black_Key_Pitches[iter]
    Black_Key.push(
      <rect
        key={iter}
        className="Preview_Key_Black"
        fill={Active_Key_Color(Pitch) || Black_Key_Color}
        x={PL.Note_Position(Pitch)}
        y={PL.Preview_Hit_Height}
        width={PL.Preview_Black_Key_Width}
        height={PL.Preview_Black_Key_Height}
      />
    )
  }

  const Tempo_Options = []
  for (let iter = 0; iter < VS.Preview_Tempo_Options.length; iter += 1) {
    Tempo_Options.push(
      <option key={iter} value={VS.Preview_Tempo_Options[iter]}>{VS.Preview_Tempo_Options[iter]}x</option>
    )
  }

  const Duration_Options = []
  for (let iter = 0; iter < VS.Preview_Duration_Options.length; iter += 1) {
    Duration_Options.push(
      <option key={iter} value={VS.Preview_Duration_Options[iter]}>{VS.Preview_Duration_Options[iter]} SECONDS</option>
    )
  }

  return (
    <main className={View}>
      <button className="Help" onClick={() => Set_Help(!Help)}>HELP</button>
      {(Error_Message !== '') && (
        <div className="Error_Message">{Error_Message}</div>
      )}
      {Help && (
        <section className="Tutorial">
          <h1 className="Tutorial_Title">TUTORIAL</h1>
          <div className="Tutorial_Content">
            <div className="Tutorial_Part">
              <h2>Guide</h2>
              <p>Welcome to the web MIDI -&gt; MP4 "NoteDrop" converter!</p>
              <ol>
                <li>Start with providing a MIDI file (other types are not supported). To do so, click the "ATTACH A FILE" button and browse your files to find the desired one.</li>
                <li>Then, the "CUSTOMIZATION" panel will show on the right side of the screen. Read its instruction to understand how to use it.</li>
                <li>If you want to change provided file, click the newly-appeared "CHANGE FILE" button. If you want to hide the tutorial, click "HELP" button once again.</li>
                <li>When customization is over and you are ready to download the video, click the "DOWNLOAD" button. Process may take a few minutes.</li>
              </ol>
              <p>For further questions feel free to contact me via falling-notes@gmail.com.</p>
            </div>
            <div className="Tutorial_Part">
              <h2>Personalization</h2>
              <ol>
                <li>
                  <strong>Falling Notes</strong>
                  <p>
                    You may choose a color for each of:<br />
                    left-hand falling white notes, left-hand falling black notes, right-hand falling white notes, right-hand falling black notes.
                  </p>
                  <p>Select desired one from the easy-access color panel or directly, by clicking on the color box at the right end of the row.</p>
                  <p>By default, color of the falling black notes assigned to L/R hand is matched as darker tone of the color chosen for corresponding white notes. This setting will get off when you manually select a color for any of falling black notes. You may turn it on again by clicking "AUTO" button assigned to desired hand.</p>
                </li>
                <li>
                  <strong>Keyboard</strong>
                  <p>You may choose colors for the keyboard itself; white and black keys independently. To do so, use colors from easy-access color panel or directly - like before.</p>
                </li>
                <li>
                  <strong>Background</strong>
                  <p>First, choose a background type. Then, choose color/colors assigned to it. For stripes/grid you may also select line settings - color and thickness.</p>
                </li>
                <li>
                  <strong>Tempo</strong>
                  <p>You may select speed of your video - default setting is "real time".</p>
                </li>
                <li>
                  <strong>Duration</strong>
                  <p>You may select time duration of looped fragment of provided notes. Loop always starts at the beginning of the notes (second 0).</p>
                </li>
              </ol>
            </div>
          </div>
        </section>
      )}
      <div className="Central-A">
        <input
          id="Input_File"
          className="Input_File"
          type="file"
          onChange={Upload_File}
        />
        {(File_Name !== '') && (
          <button className="Download_File" type="button" onClick={Render} disabled={Rendering}>
            DOWNLOAD FILE
          </button>
        )}
        <label className="Attach_A_File" htmlFor="Input_File">
          {(File_Name === '') ? 'ATTACH A FILE' : 'CHANGE FILE'}
        </label>
        <div>
          {(File_Name === '') ? 'NO FILE SELECTED' : File_Name}
        </div>
      </div>
      {(File_Name !== '') && (
        <section className="Personalization">
          <div className="Preview">
            <svg
              className="Preview_Svg"
              viewBox={`0 0 ${PL.Preview_Width} ${PL.Preview_Height}`}
              preserveAspectRatio="none"
            >
              <rect className="Preview_Background" x="0" y="0" width={PL.Preview_Width} height={PL.Preview_Height} fill={Preview_Background_Fill} />
              {Vertical_Line}
              {Horizontal_Line}
              {Note}
              {White_Key}
              {Black_Key}
            </svg>
          </div>
          <section className="Color_Panel">
            {Rendering && (
              <div className="Rendering_Message">
                <div>Rendering...</div>
                <div>Process may take a few minutes.</div>
                <button className="Cancel_Render" type="button" onClick={Cancel_Render}>
                  CANCEL
                </button>
              </div>
            )}
            {(!Rendering) && (
              <>
                {Basic_Color_Row('LEFT WHITE', VS.Basic_Note_Colors, Left_White_Note_Color, Change_Left_White_Note_Color)}
                {Auto_Color_Row('LEFT BLACK', Left_Black_Note_Color, Left_Black_Note_Color_Auto, Change_Left_Black_Note_Color, Auto_Left_Black_Note_Color)}
                {Basic_Color_Row('RIGHT WHITE', VS.Basic_Note_Colors, Right_White_Note_Color, Change_Right_White_Note_Color)}
                {Auto_Color_Row('RIGHT BLACK', Right_Black_Note_Color, Right_Black_Note_Color_Auto, Change_Right_Black_Note_Color, Auto_Right_Black_Note_Color)}
                {Basic_Color_Row('WHITE KEYS', VS.Basic_White_Key_Colors, White_Key_Color, Set_White_Key_Color)}
                {Basic_Color_Row('BLACK KEYS', VS.Basic_Black_Key_Colors, Black_Key_Color, Set_Black_Key_Color)}
                <div className="Color_Row">
                  <div className="Color_Title">BACKGROUND</div>
                  <select
                    className="Select_Input"
                    value={Background_Type}
                    onChange={(Input) => Set_Background_Type(Input.target.value as VS.Background_Type)}
                  >
                    <option value="Solid">SOLID</option>
                    <option value="Vertical_Stripes">VERTICAL STRIPES</option>
                    <option value="Horizontal_Stripes">HORIZONTAL STRIPES</option>
                    <option value="Grid">GRID</option>
                  </select>
                </div>
                {(Background_Type === 'Solid') && Basic_Color_Row('BACKGROUND COLOR', VS.Basic_Background_Colors, Solid_Color, Set_Solid_Color)}
                {((Background_Type === 'Vertical_Stripes') || (Background_Type === 'Horizontal_Stripes') || (Background_Type === 'Grid')) && Basic_Color_Row('BACKGROUND COLOR', VS.Basic_Background_Colors, Stripes_Color, Set_Stripes_Color)}
                {((Background_Type === 'Vertical_Stripes') || (Background_Type === 'Grid')) && Line_Row('VERTICAL LINE', Vertical_Line_Thickness, Vertical_Line_Color, Set_Vertical_Line_Thickness, Set_Vertical_Line_Color)}
                {((Background_Type === 'Horizontal_Stripes') || (Background_Type === 'Grid')) && Line_Row('HORIZONTAL LINE', Horizontal_Line_Thickness, Horizontal_Line_Color, Set_Horizontal_Line_Thickness, Set_Horizontal_Line_Color)}
                <div className="Color_Row">
                  <div className="Color_Title">TEMPO</div>
                  <select
                    className="Select_Input"
                    value={Tempo}
                    onChange={(Input) => Set_Tempo(Number(Input.target.value))}
                  >
                    {Tempo_Options}
                  </select>
                </div>
                <div className="Color_Row">
                  <div className="Color_Title">PREVIEW</div>
                  <select
                    className="Select_Input"
                    value={Duration}
                    onChange={(Input) => Set_Duration(Number(Input.target.value))}
                  >
                    {Duration_Options}
                  </select>
                </div>
                <div className="Color_Row">
                  <div className="Color_Title">SOUND</div>
                  <button className={(Mute ? 'Mute_Preview_Active' : 'Mute_Preview')} type="button" onClick={Change_Mute}>
                    {Mute ? 'UNMUTE' : 'MUTE'}
                  </button>
                </div>
              </>
            )}
          </section>
        </section>
      )}
    </main>
  )

}

export default App