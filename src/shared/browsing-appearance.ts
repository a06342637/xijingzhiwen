import type {Values} from './model';
import {FEATURES} from './model';
import {fieldSupported} from './devices';

// Older broad randomization could enable accessibility color substitutions.
// Repair those generated values at launch, while preserving explicit presets.
export function browsingAppearance(values:Values,locked:readonly string[]=[]):Values{
 if(values.randomStrategy!=='broad')return values;
 const next={...values};
 for(const [key,value] of [['forcedColors','none'],['inverted-colors','false'],['contrast','no-preference']] as const)if(!locked.includes(key))next[key]=fieldSupported(key,values)?value:FEATURES.find(f=>f.key===key)!.default;
 return next;
}
