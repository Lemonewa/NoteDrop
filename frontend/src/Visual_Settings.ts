export type Background_Type = 'Solid' | 'Gradient' | 'Vertical_Stripes' | 'Horizontal_Stripes' | 'Grid'

export const Default_Left_White_Note_Color = '#1e88e5'
export const Default_Right_White_Note_Color = '#43a047'
export const Default_White_Key_Color = '#ffffff'
export const Default_Black_Key_Color = '#000000'
export const Default_Background_Color = '#444444'
export const Default_Gradient_Top_Color = '#e53935'
export const Default_Gradient_Bottom_Color = '#fdd835'
export const Default_Line_Color = '#ffffff'
export const Default_Line_Thickness = 0.25
export const Default_Tempo = 1
export const Default_Duration = 10

export const Basic_Note_Colors = [
  '#ff4fb3',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa'
]
export const Basic_White_Key_Colors = ['#ffffff', '#d9d9d9', '#f2e8cf', '#ffd3b6', '#c8a47e']
export const Basic_Black_Key_Colors = ['#000000', '#333333', '#3b2416', '#143d2c', '#0b1f4d']
export const Basic_Background_Colors = ['#d9d9d9', '#444444', '#f2e8cf', '#0b1f4d', '#b7d7f0', '#d7c8f2', '#f4c6d8']
export const Basic_Line_Colors = ['#ffffff', '#000000']

export const Preview_Line_Thickness_Options = [0.125, 0.25, 0.5, 1]
export const Preview_Tempo_Options = [0.25, 0.5, 0.75, 1, 1.25, 1.5]
export const Preview_Duration_Options = [10, 20, 30]

export function Dark_Color(Color: string) {
  const Red = Math.round(parseInt(Color.slice(1,3),16) * 0.65)
  const Green = Math.round(parseInt(Color.slice(3,5),16) * 0.65)
  const Blue = Math.round(parseInt(Color.slice(5,7),16) * 0.65)
  const Red_Hex = Red.toString(16).padStart(2, '0')
  const Green_Hex = Green.toString(16).padStart(2, '0')
  const Blue_Hex = Blue.toString(16).padStart(2, '0')
  return `#${Red_Hex}${Green_Hex}${Blue_Hex}`
}
