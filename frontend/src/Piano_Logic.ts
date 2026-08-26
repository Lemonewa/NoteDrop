export const Preview_Width = 960
export const Preview_Height = 720
export const Preview_Fall_Time = 4
export const Preview_Keyboard_Height = 100
export const Preview_Hit_Height = Preview_Height - Preview_Keyboard_Height
export const Preview_Min_Pitch = 21
export const Preview_Max_Pitch = 108
export const Preview_Pixels_Per_Second = Preview_Hit_Height / Preview_Fall_Time

export function Key_Color(Pitch: number) {
  Pitch = Pitch % 12
  if (Pitch === 1 || Pitch === 3 || Pitch === 6 || Pitch === 8 || Pitch === 10) {
    return 1
  }
  return 0
}

export const Preview_White_Key_Pitches: number[] = []
export const Preview_Black_Key_Pitches: number[] = []

for (let iter = Preview_Min_Pitch; iter <= Preview_Max_Pitch; iter += 1) {
  if (Key_Color(iter)) {
    Preview_Black_Key_Pitches.push(iter)
  }
  else {
    Preview_White_Key_Pitches.push(iter)
  }
}

export const Preview_White_Key_Width = Preview_Width / Preview_White_Key_Pitches.length
export const Preview_Black_Key_Width = Preview_White_Key_Width * 0.62
export const Preview_Black_Key_Height = Preview_Keyboard_Height * 0.62

function White_Key_Index(Pitch: number) {
  let Count = 0
  for (let iter = Preview_Min_Pitch; iter <= Preview_Max_Pitch; iter += 1) {
    if (iter >= Pitch) {
      break
    }
    if (!Key_Color(iter)) {
      Count += 1
    }
  }
  return Count
}

export function Note_Position(Pitch: number) {
  if (Key_Color(Pitch)) {
    return (White_Key_Index(Pitch) * Preview_White_Key_Width) - (Preview_Black_Key_Width / 2)
  }
  return White_Key_Index(Pitch) * Preview_White_Key_Width
}

export function Note_Width(Pitch: number) {
  if (Key_Color(Pitch)) {
    return Preview_Black_Key_Width
  }
  return Preview_White_Key_Width
}