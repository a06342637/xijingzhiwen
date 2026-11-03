export type DashboardStatus='waiting'|'running'|'complete'|'limited'|'error';
export interface DashboardItem {label:string;value:string;status?:'pass'|'warn'|'fail'|'info';detail?:string}
export interface DashboardSource {id:string;name:string;url:string;status:DashboardStatus;summary:string;score?:number;grade?:string;items:DashboardItem[];updatedAt?:string;durationMs?:number}
export interface DashboardState {profileName:string;engine:string;kernelVersion:string;architecture:string;proxy:boolean;diagnosticLinks?:boolean;phase:'idle'|'running'|'complete';startedAt?:string;completedAt?:string;identityError?:string;identity?:{ip?:string;country?:string;region?:string;city?:string;ipTimezone?:string;isp?:string;source?:string};startup?:{exitIp?:string;timezone?:string;locale?:string};observation?:any;observationStatus?:'running'|'complete'|'limited';observationAt?:string;observationError?:string;sources:DashboardSource[]}
export const DASHBOARD_SOURCES=[
 {id:'who',name:'Who · 1ms.dog',url:'https://who.1ms.dog/'},
 {id:'browserleaks',name:'BrowserLeaks · 网络',url:'https://browserleaks.com/ip'},
 {id:'sannysoft',name:'Sannysoft · 浏览器检查',url:'https://bot.sannysoft.com/'},
 {id:'creepjs',name:'CreepJS · 指纹一致性',url:'https://abrahamjuliot.github.io/creepjs/'},
 {id:'whoer',name:'Whoer · 网络检测',url:'https://whoer.net/zh'}
] as const;
export function dashboardSources():DashboardSource[]{return DASHBOARD_SOURCES.map(s=>({...s,status:'waiting',summary:'等待检测',items:[]}));}
