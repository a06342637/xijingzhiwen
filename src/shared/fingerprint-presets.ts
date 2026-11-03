import {FEATURES,defaultValues,type AppSettings,type Values} from './model';
import {fieldSupported} from './devices';

export function fingerprintLocks(settings:Pick<AppSettings,'fingerprintDefaults'|'fingerprintLocks'>):string[]{
 const initial=defaultValues();
 return settings.fingerprintLocks??FEATURES.filter(f=>settings.fingerprintDefaults[f.key]!==initial[f.key]).map(f=>f.key);
}

// Use the environment's own values for locked fields, so later default edits
// do not rewrite an existing environment when its owner clicks randomize.
export function preservedFingerprint(base:Values,keys:readonly string[]):Values{
 const locked=new Set(keys.filter(k=>fieldSupported(k,base)));
 const include=(keys:string[])=>keys.forEach(k=>locked.add(k));
 if(locked.has('cpuModel')&&base.cpuModel)include(['platform','cpuModel','cpu']);
 if((locked.has('gpuModel')&&base.gpuModel)||['gpuVendor','gpuRenderer'].some(k=>locked.has(k)&&base[k]))include(['platform','gpuModel','gpuBackend','gpuVendor','gpuRenderer']);
 if(['gpuBackend','gpuVendor','gpuRenderer'].some(k=>locked.has(k)))include(['gpuModel','gpuBackend','gpuVendor','gpuRenderer']);
 if(base.hardwareRandom===false)include(['hardwareRandom','platform','cpuModel','gpuModel','hardwareRam','cpu','memory','gpuBackend','gpuVendor','gpuRenderer']);
 if(locked.has('fontPolicy')||locked.has('fontWhitelist')||locked.has('fontsDir'))include(['fontPolicy','fontWhitelist','fontsDir','windowsFontMetrics']);
 if(locked.has('widevine'))include(['widevine','widevinePath']);
 if(locked.has('pointer')||locked.has('touch')||locked.has('hover'))include(['pointer','touch','hover']);
 if(locked.has('identityMode')&&base.identityMode==='off')include(['identityMode','pixelNoise','audioRender','gpuModel','gpuVendor','gpuRenderer','gpuBackend','synthetic']);
 if(locked.has('noise')&&base.noise===false)include(['noise','pixelNoise','audioRender']);
 return Object.fromEntries([...locked].filter(k=>base[k]!==undefined).map(k=>[k,base[k]]));
}
