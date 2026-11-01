import {z} from 'zod';
import {newProfile,type AppSettings} from '../shared/model';
import {validateProfile} from '../shared/config';

export function validateSettingsPatch(raw:unknown,current:AppSettings):AppSettings {
 const patch=z.object({view:z.enum(['cards','list']).optional(),theme:z.enum(['system','light','dark']).optional(),maxBrowsers:z.number().int().min(1).max(50).optional(),automaticUpdates:z.boolean().optional(),fingerprintDefaults:z.record(z.string(),z.union([z.string().max(8192),z.number().finite(),z.boolean()])).optional()}).strict().parse(raw);
 const settings={...current,...patch};
 if(patch.fingerprintDefaults){const profile=newProfile('00000000-0000-4000-8000-000000000001','1','',patch.fingerprintDefaults);profile.name='默认指纹预设';settings.fingerprintDefaults=validateProfile(profile).values;}
 return settings;
}
