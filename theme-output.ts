// @ts-nocheck
export type Theme = {
  accentBackground: string;
  accentColor: string;
  background0: string;
  background025: string;
  background05: string;
  background075: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color0: string;
  color025: string;
  color05: string;
  color075: string;
  background: string;
  backgroundHover: string;
  backgroundPress: string;
  backgroundFocus: string;
  borderColor: string;
  borderColorHover: string;
  borderColorPress: string;
  borderColorFocus: string;
  color: string;
  colorHover: string;
  colorPress: string;
  colorFocus: string;
  colorTransparent: string;
  placeholderColor: string;
  outlineColor: string;

}

function t(a: [number, number][]) {
  let res: Record<string,string> = {}
  for (const [ki, vi] of a) {
    res[ks[ki] as string] = colors[vi] as string
  }
  return res as Theme
}
export const colors = [
  '#0057A8',
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0.5)',
  'rgba(255,255,255,0.75)',
  '#FFFFFF',
  '#F8F9FB',
  '#F3F4F7',
  '#E2E5EC',
  '#D5DAE4',
  '#C3CAD8',
  '#AEB6C6',
  '#98A2B3',
  '#7B8394',
  '#5B6272',
  '#2B313D',
  '#12151C',
  'rgba(18,21,28,0)',
  'rgba(18,21,28,0.25)',
  'rgba(18,21,28,0.5)',
  'rgba(18,21,28,0.75)',
  '#4DA8FF',
  'rgba(21,26,34,0)',
  'rgba(21,26,34,0.25)',
  'rgba(21,26,34,0.5)',
  'rgba(21,26,34,0.75)',
  '#151A22',
  '#1D232D',
  '#232A36',
  '#262E3A',
  '#323B4A',
  '#3E4857',
  '#4E5867',
  '#656F80',
  '#7C8697',
  '#CDD4DE',
  '#EEF1F6',
  'rgba(238,241,246,0)',
  'rgba(238,241,246,0.25)',
  'rgba(238,241,246,0.5)',
  'rgba(238,241,246,0.75)',
  'rgba(0,87,168,0)',
  'rgba(0,87,168,0.25)',
  'rgba(0,87,168,0.5)',
  'rgba(0,87,168,0.75)',
  '#0A56A6',
  '#09509A',
  '#084A8E',
  '#074482',
  '#063C78',
  '#1670CF',
  '#2C80DA',
  '#4795E4',
  '#6FADEC',
  '#CFE2F7',
  'rgba(22,112,207,0)',
  'rgba(22,112,207,0.25)',
  'rgba(22,112,207,0.5)',
  'rgba(22,112,207,0.75)',
  '#1568BC',
  '#1360AC',
  '#11579B',
  '#0F4F8B',
  '#0D477B',
  '#9CC8F3',
  '#D6E9FF',
  'rgba(0,0,0,0.5)',
  'rgba(0,0,0,0.8)',
]

const ks = [
'accentBackground',
'accentColor',
'background0',
'background025',
'background05',
'background075',
'color1',
'color2',
'color3',
'color4',
'color5',
'color6',
'color7',
'color8',
'color9',
'color10',
'color11',
'color12',
'color0',
'color025',
'color05',
'color075',
'background',
'backgroundHover',
'backgroundPress',
'backgroundFocus',
'borderColor',
'borderColorHover',
'borderColorPress',
'borderColorFocus',
'color',
'colorHover',
'colorPress',
'colorFocus',
'colorTransparent',
'placeholderColor',
'outlineColor']


const n1 = t([[0, 0],[1, 0],[2, 1],[3, 2],[4, 3],[5, 4],[6, 5],[7, 6],[8, 7],[9, 8],[10, 9],[11, 10],[12, 11],[13, 12],[14, 13],[15, 14],[16, 15],[17, 16],[18, 17],[19, 18],[20, 19],[21, 20],[22, 5],[23, 4],[24, 6],[25, 6],[26, 8],[27, 7],[28, 9],[29, 8],[30, 16],[31, 15],[32, 16],[33, 15],[34, 17],[35, 13],[36, 18]])
const n2 = t([[0, 21],[1, 21],[2, 22],[3, 23],[4, 24],[5, 25],[6, 26],[7, 27],[8, 28],[9, 29],[10, 30],[11, 31],[12, 32],[13, 33],[14, 34],[15, 12],[16, 35],[17, 36],[18, 37],[19, 38],[20, 39],[21, 40],[22, 26],[23, 27],[24, 25],[25, 25],[26, 29],[27, 30],[28, 28],[29, 29],[30, 36],[31, 35],[32, 36],[33, 35],[34, 37],[35, 34],[36, 38]])
const n3 = t([[0, 5],[1, 5],[2, 41],[3, 42],[4, 43],[5, 44],[6, 0],[7, 45],[8, 46],[9, 47],[10, 48],[11, 49],[12, 50],[13, 51],[14, 52],[15, 53],[16, 54],[17, 5],[18, 1],[19, 2],[20, 3],[21, 4],[22, 0],[23, 44],[24, 45],[25, 45],[26, 47],[27, 46],[28, 48],[29, 47],[30, 5],[31, 54],[32, 5],[33, 54],[34, 1],[35, 52],[36, 2]])
const n4 = t([[0, 5],[1, 5],[2, 55],[3, 56],[4, 57],[5, 58],[6, 50],[7, 59],[8, 60],[9, 61],[10, 62],[11, 63],[12, 51],[13, 52],[14, 53],[15, 64],[16, 65],[17, 5],[18, 1],[19, 2],[20, 3],[21, 4],[22, 50],[23, 59],[24, 58],[25, 58],[26, 61],[27, 62],[28, 60],[29, 61],[30, 5],[31, 65],[32, 5],[33, 65],[34, 1],[35, 53],[36, 2]])
const n5 = t([[30, 15],[31, 14],[32, 15],[33, 14]])
const n6 = t([[30, 14],[31, 13],[32, 14],[33, 13]])
const n7 = t([[22, 8],[23, 7],[24, 9],[25, 9],[26, 11],[27, 10],[29, 11],[28, 12]])
const n8 = t([[22, 6],[23, 5],[24, 7],[25, 7],[26, 9],[27, 8],[29, 9],[28, 10]])
const n9 = t([[22, 7],[23, 6],[24, 8],[25, 8],[26, 10],[27, 9],[29, 10],[28, 11]])
const n10 = t([[22, 10],[23, 10],[24, 11],[25, 11],[26, 10],[27, 10],[29, 11],[28, 11]])
const n11 = t([[30, 35],[31, 12],[32, 35],[33, 12]])
const n12 = t([[30, 12],[31, 34],[32, 12],[33, 34]])
const n13 = t([[22, 29],[23, 30],[24, 28],[25, 28],[26, 32],[27, 33],[29, 32],[28, 31]])
const n14 = t([[22, 27],[23, 28],[24, 26],[25, 26],[26, 30],[27, 31],[29, 30],[28, 29]])
const n15 = t([[22, 28],[23, 29],[24, 27],[25, 27],[26, 31],[27, 32],[29, 31],[28, 30]])
const n16 = t([[22, 31],[23, 31],[24, 30],[25, 30],[26, 31],[27, 31],[29, 30],[28, 30]])
const n17 = t([[30, 54],[31, 53],[32, 54],[33, 53]])
const n18 = t([[30, 53],[31, 52],[32, 53],[33, 52]])
const n19 = t([[22, 47],[23, 46],[24, 48],[25, 48],[26, 50],[27, 49],[29, 50],[28, 51]])
const n20 = t([[22, 45],[23, 0],[24, 46],[25, 46],[26, 48],[27, 47],[29, 48],[28, 49]])
const n21 = t([[22, 46],[23, 45],[24, 47],[25, 47],[26, 49],[27, 48],[29, 49],[28, 50]])
const n22 = t([[22, 49],[23, 49],[24, 50],[25, 50],[26, 49],[27, 49],[29, 50],[28, 50]])
const n23 = t([[30, 65],[31, 64],[32, 65],[33, 64]])
const n24 = t([[30, 64],[31, 53],[32, 64],[33, 53]])
const n25 = t([[22, 61],[23, 62],[24, 60],[25, 60],[26, 51],[27, 52],[29, 51],[28, 63]])
const n26 = t([[22, 59],[23, 60],[24, 50],[25, 50],[26, 62],[27, 63],[29, 62],[28, 61]])
const n27 = t([[22, 60],[23, 61],[24, 59],[25, 59],[26, 63],[27, 51],[29, 63],[28, 62]])
const n28 = t([[22, 63],[23, 63],[24, 62],[25, 62],[26, 63],[27, 63],[29, 62],[28, 62]])
const n29 = t([[30, 6],[31, 5],[32, 7],[33, 7],[22, 16],[23, 15],[24, 16],[25, 15],[26, 14],[27, 13],[29, 12],[28, 11]])
const n30 = t([[22, 66]])
const n31 = t([[30, 27],[31, 28],[32, 26],[33, 26],[22, 36],[23, 35],[24, 36],[25, 35],[26, 12],[27, 34],[29, 33],[28, 32]])
const n32 = t([[22, 67]])
const n33 = t([[30, 45],[31, 0],[32, 46],[33, 46],[22, 5],[23, 54],[24, 5],[25, 54],[26, 53],[27, 52],[29, 51],[28, 50]])
const n34 = t([[30, 59],[31, 60],[32, 50],[33, 50],[22, 5],[23, 65],[24, 5],[25, 65],[26, 64],[27, 53],[29, 52],[28, 51]])

export type ThemeNames =
 | 'light'
 | 'dark'
 | 'light_accent'
 | 'dark_accent'
 | 'light_alt1'
 | 'light_alt2'
 | 'light_active'
 | 'light_surface3'
 | 'light_surface1'
 | 'light_surface2'
 | 'light_surface4'
 | 'dark_alt1'
 | 'dark_alt2'
 | 'dark_active'
 | 'dark_surface3'
 | 'dark_surface1'
 | 'dark_surface2'
 | 'dark_surface4'
 | 'light_accent_alt1'
 | 'light_accent_alt2'
 | 'light_accent_active'
 | 'light_accent_surface3'
 | 'light_accent_surface1'
 | 'light_accent_surface2'
 | 'light_accent_surface4'
 | 'dark_accent_alt1'
 | 'dark_accent_alt2'
 | 'dark_accent_active'
 | 'dark_accent_surface3'
 | 'dark_accent_surface1'
 | 'dark_accent_surface2'
 | 'dark_accent_surface4'

export type Themes = Record<ThemeNames, Theme>

export const themes: Themes = {
  light: n1,
  dark: n2,
  light_accent: n3,
  dark_accent: n4,
  light_alt1: n5,
  light_alt2: n6,
  light_active: n7,
  light_surface3: n7,
  light_Button: n7,
  light_SliderTrackActive: n7,
  light_surface1: n8,
  light_ListItem: n8,
  light_SelectTrigger: n8,
  light_Card: n8,
  light_Progress: n8,
  light_TooltipArrow: n8,
  light_SliderTrack: n8,
  light_Input: n8,
  light_TextArea: n8,
  light_surface2: n9,
  light_Checkbox: n9,
  light_Switch: n9,
  light_TooltipContent: n9,
  light_RadioGroupItem: n9,
  light_surface4: n10,
  dark_alt1: n11,
  dark_alt2: n12,
  dark_active: n13,
  dark_surface3: n13,
  dark_Button: n13,
  dark_SliderTrackActive: n13,
  dark_surface1: n14,
  dark_ListItem: n14,
  dark_SelectTrigger: n14,
  dark_Card: n14,
  dark_Progress: n14,
  dark_TooltipArrow: n14,
  dark_SliderTrack: n14,
  dark_Input: n14,
  dark_TextArea: n14,
  dark_surface2: n15,
  dark_Checkbox: n15,
  dark_Switch: n15,
  dark_TooltipContent: n15,
  dark_RadioGroupItem: n15,
  dark_surface4: n16,
  light_accent_alt1: n17,
  light_accent_alt2: n18,
  light_accent_active: n19,
  light_accent_surface3: n19,
  light_accent_Button: n19,
  light_accent_SliderTrackActive: n19,
  light_accent_surface1: n20,
  light_accent_ListItem: n20,
  light_accent_SelectTrigger: n20,
  light_accent_Card: n20,
  light_accent_Progress: n20,
  light_accent_TooltipArrow: n20,
  light_accent_SliderTrack: n20,
  light_accent_Input: n20,
  light_accent_TextArea: n20,
  light_accent_surface2: n21,
  light_accent_Checkbox: n21,
  light_accent_Switch: n21,
  light_accent_TooltipContent: n21,
  light_accent_RadioGroupItem: n21,
  light_accent_surface4: n22,
  dark_accent_alt1: n23,
  dark_accent_alt2: n24,
  dark_accent_active: n25,
  dark_accent_surface3: n25,
  dark_accent_Button: n25,
  dark_accent_SliderTrackActive: n25,
  dark_accent_surface1: n26,
  dark_accent_ListItem: n26,
  dark_accent_SelectTrigger: n26,
  dark_accent_Card: n26,
  dark_accent_Progress: n26,
  dark_accent_TooltipArrow: n26,
  dark_accent_SliderTrack: n26,
  dark_accent_Input: n26,
  dark_accent_TextArea: n26,
  dark_accent_surface2: n27,
  dark_accent_Checkbox: n27,
  dark_accent_Switch: n27,
  dark_accent_TooltipContent: n27,
  dark_accent_RadioGroupItem: n27,
  dark_accent_surface4: n28,
  light_SwitchThumb: n29,
  light_SliderThumb: n29,
  light_Tooltip: n29,
  light_ProgressIndicator: n29,
  light_SheetOverlay: n30,
  light_DialogOverlay: n30,
  light_ModalOverlay: n30,
  light_accent_SheetOverlay: n30,
  light_accent_DialogOverlay: n30,
  light_accent_ModalOverlay: n30,
  dark_SwitchThumb: n31,
  dark_SliderThumb: n31,
  dark_Tooltip: n31,
  dark_ProgressIndicator: n31,
  dark_SheetOverlay: n32,
  dark_DialogOverlay: n32,
  dark_ModalOverlay: n32,
  dark_accent_SheetOverlay: n32,
  dark_accent_DialogOverlay: n32,
  dark_accent_ModalOverlay: n32,
  light_accent_SwitchThumb: n33,
  light_accent_SliderThumb: n33,
  light_accent_Tooltip: n33,
  light_accent_ProgressIndicator: n33,
  dark_accent_SwitchThumb: n34,
  dark_accent_SliderThumb: n34,
  dark_accent_Tooltip: n34,
  dark_accent_ProgressIndicator: n34,
}
