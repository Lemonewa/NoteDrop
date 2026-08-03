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

  return (
    <main>
      <button className="help" onClick={() => set_help(!help)}>HELP</button>
      {help && <section className="tutorial">TUTORIAL</section>}
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
        <div>{file_name === '' && 'NO FILE SELECTED'}{file_name !== '' && file_name}</div>
      </div>
    </main>
  )

}

export default App
