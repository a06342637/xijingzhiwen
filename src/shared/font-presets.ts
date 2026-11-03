import type {Values} from './model';

// These are installed font families, not downloaded fonts or a fake font API.
export const ENGLISH_WINDOWS_FONTS=['Arial','Calibri','Cambria','Consolas','Segoe UI','Times New Roman','Courier New','Verdana','Georgia','Comic Sans MS'];
export const MULTILINGUAL_WINDOWS_FONTS=['Microsoft YaHei','Microsoft YaHei UI','SimSun','NSimSun','SimHei','DengXian','Microsoft JhengHei','Microsoft JhengHei UI','MingLiU','PMingLiU','Meiryo','Meiryo UI','Yu Gothic','Yu Gothic UI','MS Gothic','MS PGothic','MS Mincho','MS PMincho','Malgun Gothic','Gulim','Batang','Tahoma','Leelawadee UI','Leelawadee','Segoe UI Symbol','Segoe UI Emoji'];
export function englishWindowsFonts(values:Values):Values{
 if(values.platform!=='windows'||values.deviceType!=='desktop'||values.identityMode==='off')throw new Error('英文 Windows 字体名单仅用于 Windows 电脑自定义身份');
 return {...values,fontPolicy:'restricted',fontWhitelist:[...ENGLISH_WINDOWS_FONTS,...MULTILINGUAL_WINDOWS_FONTS].join(',')};
}
export function regionalWindowsFonts(values:Values,locale:string):Values{
 const local=/^ja(?:-|$)/i.test(locale)?['Meiryo','Meiryo UI','Yu Gothic','Yu Gothic UI','MS Gothic','MS PGothic','MS Mincho','MS PMincho']:/^th(?:-|$)/i.test(locale)?['Tahoma','Leelawadee UI','Leelawadee','Angsana New','Cordia New']:[];
 return {...englishWindowsFonts(values),fontWhitelist:[...new Set([...ENGLISH_WINDOWS_FONTS,...MULTILINGUAL_WINDOWS_FONTS,...local])].join(',')};
}

// Repair only old automatically generated broad lists at launch. Explicit
// restricted policies remain editable and saved profiles are never rewritten.
export function browsingFonts(values:Values,locked:readonly string[]=[]):Values{
 if(['fontPolicy','fontWhitelist','fontsDir'].some(k=>locked.includes(k)))return values;
 if(values.randomStrategy!=='broad'||values.fontPolicy!=='restricted'||values.deviceType!=='desktop'||values.fontsDir)return values;
 const oldLists=[ENGLISH_WINDOWS_FONTS,[...ENGLISH_WINDOWS_FONTS,'Meiryo','Meiryo UI','Yu Gothic','Yu Gothic UI','MS Gothic','MS PGothic','MS Mincho','MS PMincho'],[...ENGLISH_WINDOWS_FONTS,'Tahoma','Leelawadee UI','Leelawadee','Angsana New','Cordia New'],['Arial','Helvetica','Times New Roman','Courier New'],['Arial','Helvetica','Georgia','Verdana'],['Arial','DejaVu Sans','DejaVu Serif','DejaVu Sans Mono'],['Liberation Sans','Liberation Serif','Liberation Mono','Arial']];
 return oldLists.some(x=>x.join(',')===values.fontWhitelist)?{...values,fontPolicy:'native',fontWhitelist:''}:values;
}
