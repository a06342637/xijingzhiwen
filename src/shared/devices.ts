import {defaultValues,type Values} from './model';
export type Engine='chromium'|'firefox';
export const FIREFOX_VERSION='158.0.1-beta.41';
export const ENGINE_NAMES={chromium:'Chromix / Chromium',firefox:'Firefox / Camoufox（测试版）'};
export const SCREEN_PRESETS=[
 [1366,768],[1536,864],[1600,900],[1920,1080],[1920,1200],[2560,1440],[2560,1600],[2880,1800],[3024,1964],[3440,1440],[3840,2160],[5120,1440],[5120,2880]
] as const;
export const DEVICES=[
 {id:'iphone-se',name:'iPhone SE',type:'iphone',width:375,height:667,dpr:2},
 {id:'iphone-13',name:'iPhone 13 / 14',type:'iphone',width:390,height:844,dpr:3},
 {id:'iphone-15',name:'iPhone 15 / 16',type:'iphone',width:393,height:852,dpr:3},
 {id:'iphone-pro',name:'iPhone 16 Pro',type:'iphone',width:402,height:874,dpr:3},
 {id:'iphone-max',name:'iPhone 16 Pro Max',type:'iphone',width:440,height:956,dpr:3},
 {id:'ipad-mini',name:'iPad mini',type:'ipad',width:744,height:1133,dpr:2},
 {id:'ipad',name:'iPad 10 / 11',type:'ipad',width:820,height:1180,dpr:2},
 {id:'ipad-air',name:'iPad Air / Pro 11',type:'ipad',width:834,height:1194,dpr:2},
 {id:'ipad-pro',name:'iPad Pro 13',type:'ipad',width:1032,height:1376,dpr:2},
 {id:'pixel',name:'Google Pixel 8 / 9',type:'android',width:412,height:915,dpr:2.625},
 {id:'galaxy',name:'Samsung Galaxy S 系列',type:'android',width:360,height:780,dpr:3},
 {id:'android-large',name:'Android 大屏手机',type:'android',width:412,height:892,dpr:3},
 {id:'android-tablet',name:'Android 平板',type:'android',width:800,height:1280,dpr:2}
] as const;
// Dimensions are CSS/DIP layout samples. They do not identify a physical device.
export function applyScreen(v:Values,width:number,height:number):Values {
 return {...v,screenWidth:width,screenHeight:height,taskbarHeight:v.deviceType==='desktop'?48:0,windowWidth:Math.max(400,Math.min(width,1280)),windowHeight:Math.max(400,Math.min(height,860)),viewportWidth:width,viewportHeight:height,maximized:false};
}
export function applyDevice(v:Values,id:string,landscape=false):Values {
 const d=DEVICES.find(x=>x.id===id);if(!d)throw new Error('设备预设不存在');
 const width=landscape?d.height:d.width,height=landscape?d.width:d.height;v={...v};const defaults=defaultValues();for(const key of Object.keys(v))if(!fieldSupported(key,{...v,engine:'chromium',deviceType:d.type}))v[key]=defaults[key];
 const models:Record<string,string>={pixel:'Pixel 8',galaxy:'SM-S921B','android-large':'Android Phone','android-tablet':'Android Tablet'};
 return {...applyScreen({...v,engine:'chromium',deviceType:d.type},width,height),deviceModel:models[d.id]||'',deviceScale:String(d.dpr),viewportMode:'fixed',touch:5,pointer:'coarse',hover:'none',brand:'Chrome',brandVersion:'',platformVersion:'',userAgent:'',identityMode:'seeded',pixelNoise:'native',audioRender:'native',audioSeed:'',gpuBackend:'native',gpuVendor:'',gpuRenderer:'',fontPolicy:'native',fontWhitelist:'',windowsFontMetrics:false};
}
const firefoxKeys=new Set(['engine','deviceType','deviceScale','platform','brand','brandVersion','userAgent','locale','timezone','geoip','webrtcMode','webrtcIp','webrtcPolicy','gpuBackend','gpuVendor','gpuRenderer','cpu','screenWidth','screenHeight','taskbarHeight','windowWidth','windowHeight','viewportMode','viewportWidth','viewportHeight','touch','colorScheme','forcedColors','reduced-motion','fontPolicy','fontWhitelist','thirdPartyCookies']);
const mobileKeys=new Set(['engine','deviceType','deviceModel','deviceScale','userAgent','locale','timezone','geoip','webrtcPolicy','screenWidth','screenHeight','windowWidth','windowHeight','viewportWidth','viewportHeight','touch','colorScheme','forcedColors','reduced-motion','thirdPartyCookies']);
export function fieldSupported(key:string,v:Values){return v.engine==='firefox'?firefoxKeys.has(key):v.deviceType&&v.deviceType!=='desktop'?mobileKeys.has(key):true;}
export function mobileUA(v:Values,version:string){
 if(v.userAgent)return String(v.userAgent);
 if(v.deviceType==='android')return `Mozilla/5.0 (Linux; Android 14; ${v.deviceModel||'Pixel 8'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} ${Math.min(Number(v.screenWidth),Number(v.screenHeight))>=600?'':'Mobile '}Safari/537.36`;
 if(v.deviceType==='iphone')return 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
 return 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
}
export function mobileIdentity(v:Values,version:string){
 const android=v.deviceType==='android',landscape=Number(v.screenWidth)>Number(v.screenHeight);
 return {userAgent:mobileUA(v,version),platform:android?'Linux armv8l':v.deviceType==='ipad'?'iPad':'iPhone',userAgentMetadata:{brands:android?[{brand:'Chromium',version:version.split('.')[0]}]:[],fullVersionList:android?[{brand:'Chromium',version}]:[],platform:android?'Android':'iOS',platformVersion:android?'14.0.0':'18.0.0',architecture:'',model:android?String(v.deviceModel||'Pixel 8'):'',mobile:v.deviceType==='iphone'||Math.min(Number(v.screenWidth),Number(v.screenHeight))<600,bitness:'',wow64:false},metrics:{width:Number(v.viewportWidth),height:Number(v.viewportHeight),screenWidth:Number(v.screenWidth),screenHeight:Number(v.screenHeight),deviceScaleFactor:Number(v.deviceScale),mobile:true,screenOrientation:{type:landscape?'landscapePrimary':'portraitPrimary',angle:landscape?90:0}}};
}
export function applyDesktop(v:Values,platform:string):Values{
 return {...v,deviceType:'desktop',deviceModel:'',platform,platformVersion:'',userAgent:'',deviceScale:'1',viewportMode:'native',touch:0,pointer:'fine',hover:'hover',screenWidth:1920,screenHeight:1080,taskbarHeight:48,windowWidth:1280,windowHeight:860,viewportWidth:1280,viewportHeight:720};
}
export function devicePreset(v:Values){
 return DEVICES.find(d=>d.type===v.deviceType&&Number(v.deviceScale)===d.dpr&&((d.width===v.screenWidth&&d.height===v.screenHeight)||(d.width===v.screenHeight&&d.height===v.screenWidth)))?.id||'';
}
export function environmentLabel(v:Values){return ({iphone:'iPhone · 模拟',ipad:'iPad · 模拟',android:'Android · 模拟'} as Record<string,string>)[String(v.deviceType)]||({windows:'Windows',macos:'macOS',linux:'Linux'} as Record<string,string>)[String(v.platform)]||String(v.platform);}
