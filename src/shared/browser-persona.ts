import type {Values} from './model';
// Product presets favor the native Chromium brand outside Windows. Other
// Chromium brands are offered only by this product's Windows preset.
export function personaBrands(values:Values):string[]{
 if(values.engine==='firefox')return ['Firefox'];
 return values.deviceType==='desktop'&&values.platform==='windows'?['Chrome','Edge','Opera','Vivaldi']:['Chrome'];
}
export function normalizePersona(values:Values):Values{
 const brands=personaBrands(values);return brands.includes(String(values.brand))?values:{...values,brand:brands[0],brandVersion:'',userAgent:''};
}
