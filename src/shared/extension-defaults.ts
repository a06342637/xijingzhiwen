import type {AppSettings,Extension,Values,Profile} from './model';
export function enabledExtensionIds(settings:Pick<AppSettings,'inheritEnabledExtensions'>,extensions:Extension[],values:Values,mode:Profile['mode']='custom'){
 if(settings.inheritEnabledExtensions===false||mode==='measured'||values.engine==='firefox')return [];
 const ids=[...new Set(extensions.filter(e=>e.enabled===true).map(e=>e.id))];
 if(ids.length>50)throw new Error('新环境最多加载50个默认扩展，请先关闭部分扩展');return ids;
}
