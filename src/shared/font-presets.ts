import type {Values} from './model';

// These are installed font families, not downloaded fonts or a fake font API.
export const ENGLISH_WINDOWS_FONTS=['Arial','Calibri','Cambria','Consolas','Segoe UI','Times New Roman','Courier New','Verdana','Georgia','Comic Sans MS'];
export function englishWindowsFonts(values:Values):Values{
 if(values.platform!=='windows'||values.deviceType!=='desktop'||values.identityMode==='off')throw new Error('英文 Windows 字体名单仅用于 Windows 电脑自定义身份');
 return {...values,fontPolicy:'restricted',fontWhitelist:ENGLISH_WINDOWS_FONTS.join(',')};
}
