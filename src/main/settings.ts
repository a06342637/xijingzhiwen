import {z} from 'zod';
import {FEATURES,newProfile,type AppSettings} from '../shared/model';
import {validateProfile} from '../shared/config';
import {fingerprintLocks} from '../shared/fingerprint-presets';
import {applyControlledValues,CONTROLLED_FEATURES,type ControlledFeatures} from '../shared/controlled-features';

export function validateControlledChange(raw:unknown,current:AppSettings):{settings:AppSettings;enable:boolean;label:string;note:string}{
 const change=z.object({id:z.enum(CONTROLLED_FEATURES.map(g=>g.id) as [string,...string[]]),enabled:z.boolean()}).strict().parse(raw);
 const group=CONTROLLED_FEATURES.find(g=>g.id===change.id)!;
 const controlledFeatures:ControlledFeatures={...current.controlledFeatures,[change.id]:change.enabled};
 return {settings:{...current,controlledFeatures},enable:change.enabled&&current.controlledFeatures?.[group.id]!==true,label:group.label,note:group.note};
}

export function validateSettingsPatch(raw:unknown,current:AppSettings):AppSettings {
 const patch=z.object({view:z.enum(['cards','list']).optional(),theme:z.enum(['system','light','dark']).optional(),maxBrowsers:z.number().int().min(1).max(50).optional(),automaticUpdates:z.boolean().optional(),startupDashboard:z.boolean().optional(),diagnosticLinks:z.boolean().optional(),inheritEnabledExtensions:z.boolean().optional(),randomBookmarks:z.boolean().optional(),fingerprintLocks:z.array(z.enum(FEATURES.map(f=>f.key) as [string,...string[]])).max(FEATURES.length).optional(),fingerprintDefaults:z.record(z.string(),z.union([z.string().max(8192),z.number().finite(),z.boolean()])).optional()}).strict().parse(raw);
 const settings={...current,...patch};
 if(patch.fingerprintDefaults){const profile=newProfile('00000000-0000-4000-8000-000000000001','1','',applyControlledValues(patch.fingerprintDefaults,current.controlledFeatures));profile.name='默认指纹预设';settings.fingerprintDefaults=validateProfile(profile).values;if(!patch.fingerprintLocks)settings.fingerprintLocks=[...new Set([...fingerprintLocks(current),...FEATURES.filter(f=>settings.fingerprintDefaults[f.key]!==current.fingerprintDefaults[f.key]).map(f=>f.key)])];}
 if(patch.fingerprintLocks)settings.fingerprintLocks=[...new Set(patch.fingerprintLocks)];
 return settings;
}
