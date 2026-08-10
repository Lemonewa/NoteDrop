import { ChangeEvent, useState } from 'react'
import './App.css'

function App() {

  const [help, set_help] = useState(false)
  const [file_name, set_file_name] = useState('')

  async function upload_file(input: ChangeEvent<HTMLInputElement>) {
    
    const file = input.target.files?.[0]

    if (!file) {
      return
    }

    set_file_name(file.name)
    const upload = new FormData()
    upload.append('file', file)

    const send = {
      method: 'POST',
      body: upload
    }

    await fetch('/upload', send)

  }

  const view =
    file_name === '' && !help ? 'view-0' :
    file_name === '' && help ? 'view-1' :
    file_name !== '' && !help ? 'view-2' :
    'view-3'

  return (
    <main className={view}>
      <button className="help" onClick={() => set_help(!help)}>HELP</button>
      {help && (
        <section className="tutorial">
          <h1 className="tutorial_title">TUTORIAL</h1>
          <div className="tutorial_content">
            <div className="tutorial_part">
              <h2>Guide</h2>
              <p>
                Welcome to the web MIDI -&gt; MP4 "Falling Notes" converter!
              </p>
              <ol>
                <li>Start with providing a MIDI file (other types are not supported). To do so, click the "ATTACH A FILE" button and browse your files to find the desired one.</li>
                <li>Then, the "CUSTOMIZATION" panel will show on the right side of the screen. Read its instruction to understand how to use it.</li>
                <li>If you want to change provided file, click the newly-appeared "CHANGE FILE" button. If you want to hide the tutorial, click "HELP" button once again.</li>
                <li>When customization is over and you are ready to download the video, click the "DOWNLOAD" button. Process may take a few minutes.</li>
              </ol>
              <p>
                For further questions feel free to contact me via falling-notes@gmail.com.
              </p>
            </div>
            <div className="tutorial_part">
              <h2>Customization</h2>
              <p>
                Use the customization panel to adjust how the final recording will look. Start with the preview, because every selected option should be checked there before downloading. Choose colors for the left and right hand notes, then select the tile style, background, and effects. Keep the settings clear enough for the notes to stay readable in the final video.
              </p>
            </div>
          </div>
        </section>
      )}
      <div className="central-a">
        <input
          id="input_file"
          className="input_file"
          type="file"
          onChange={upload_file}
        />
        <label className="attach_a_file" htmlFor="input_file">
          {file_name === '' && 'ATTACH A FILE'}
          {file_name !== '' && 'CHANGE FILE'}
        </label>
        <div>
          {file_name === '' && 'NO FILE SELECTED'}
          {file_name !== '' && file_name}
        </div>
      </div>
      {file_name !== '' && (
        <section className="personalization">
          <div className="preview"></div>
        </section>
      )}
    </main>
  )

}

export default App
