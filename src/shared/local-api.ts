export interface LocalApiState {enabled:boolean;running:boolean;port:number;hasKey:boolean;error?:string}
export const LOCAL_API_ROUTES=[
 ['GET','/status','服务状态'],['GET','/api/v1/user/list','分页查询环境'],
 ['POST','/api/v1/user/create','创建环境，默认随机指纹'],['POST','/api/v1/user/update','修改关闭的环境'],
 ['POST','/api/v1/user/random','重新随机指纹，可指定字段'],['POST','/api/v1/fingerprint/random','预览随机指纹，不保存'],
 ['POST','/api/v1/user/delete','永久删除环境及软件管理的数据'],
 ['GET','/api/v1/browser/start','启动环境，返回 Chromium CDP 地址'],['GET','/api/v1/browser/stop','关闭环境并保存浏览器数据'],
 ['GET','/api/v1/browser/active','查询运行状态'],['GET','/api/v1/browser/local-active','查询所有运行环境'],
 ['POST','/api/v1/browser/tabs','标签页查询、打开、跳转、点击、填写（两引擎）'],
 ['GET','/api/v1/kernel/list','查询已安装内核'],['GET','/api/v1/fingerprint/schema','查询字段、有效选项和功能开关']
] as const;
