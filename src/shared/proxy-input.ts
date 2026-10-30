import type {ProxyConfig} from './model';

export const PROXY_FORMATS = [
 ['auto','自动识别'],
 ['user-at','用户名:密码@网关节点:端口'],
 ['user-colon','用户名:密码:网关节点:端口'],
 ['host-at','网关节点:端口@用户名:密码'],
 ['host-colon','网关节点:端口:用户名:密码'],
 ['host-hash','网关节点:端口##用户名##密码']
] as const;
export type ProxyFormat=typeof PROXY_FORMATS[number][0];
type Parsed=Pick<ProxyConfig,'protocol'|'host'|'port'|'username'|'password'>;
function endpoint(text:string){const m=/^(\[[^\]]+\]|[^:\s/@?#]+):(\d+)$/.exec(text);if(!m)throw new Error('网关地址应为主机:端口（IPv6 使用方括号）');const port=Number(m[2]);if(port<1||port>65535)throw new Error('代理端口应为 1–65535');return {host:m[1].replace(/^\[|\]$/g,''),port};}
function credentials(text:string){const i=text.indexOf(':');if(i<0)throw new Error('认证信息应为用户名:密码');return {username:text.slice(0,i),password:text.slice(i+1)};}
export function parseProxyInput(input:string,format:ProxyFormat='auto',fallback:Parsed['protocol']='http'):Parsed {
 const text=input.trim();if(!text||/[\r\n\x00-\x1f\x7f]/.test(text))throw new Error('请粘贴一条完整的代理信息');
 const scheme=/^([a-z][a-z0-9+.-]*):\/\//i.exec(text);
 if(scheme){if(!['http','https','socks5'].includes(scheme[1].toLowerCase()))throw new Error('仅支持 HTTP、HTTPS 和 SOCKS5');let u:URL;try{u=new URL(text);}catch{throw new Error('代理 URL 格式无效');}if((u.pathname&&u.pathname!=='/')||u.search||u.hash)throw new Error('代理 URL 不能包含路径、查询或片段');const authority=text.slice(scheme[0].length).replace(/\/$/,'');const hostPart=authority.slice(authority.lastIndexOf('@')+1);try{return {protocol:scheme[1].toLowerCase() as Parsed['protocol'],...endpoint(hostPart),username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)};}catch(e){if(e instanceof URIError)throw new Error('代理凭据的 URL 编码无效');throw e;}}
 const parse=(kind:ProxyFormat):Parsed=>{
  let host='',auth='';
  if(kind==='host-hash'){const parts=text.split('##');if(parts.length<3)throw new Error('格式需要主机:端口##用户名##密码');return {protocol:fallback,...endpoint(parts[0]),username:parts[1],password:parts.slice(2).join('##')};}
  if(kind==='user-at'){const at=text.lastIndexOf('@');if(at<0)throw new Error('缺少 @ 分隔符');auth=text.slice(0,at);host=text.slice(at+1);}
  else if(kind==='host-at'){const at=text.indexOf('@');if(at<0)throw new Error('缺少 @ 分隔符');host=text.slice(0,at);auth=text.slice(at+1);}
  else if(kind==='host-colon'){const m=/^(\[[^\]]+\]:\d+|[^:]+:\d+):(.*)$/.exec(text);if(!m)throw new Error('格式需要主机:端口:用户名:密码');host=m[1];auth=m[2];}
  else if(kind==='user-colon'){const m=/^(.*):(\[[^\]]+\]:\d+|[^:]+:\d+)$/.exec(text);if(!m)throw new Error('格式需要用户名:密码:主机:端口');auth=m[1];host=m[2];}
  else throw new Error('请选择代理格式');
  return {protocol:fallback,...endpoint(host),...credentials(auth)};
 };
 if(format!=='auto')return parse(format);
 if(text.includes('##'))return parse('host-hash');
 const candidates:Parsed[]=[];
 for(const kind of (text.includes('@')?['user-at','host-at']:['host-colon','user-colon']) as ProxyFormat[]){try{const p=parse(kind);if(!candidates.some(c=>JSON.stringify(c)===JSON.stringify(p)))candidates.push(p);}catch{}}
 if(candidates.length===1)return candidates[0];
 if(candidates.length>1)throw new Error('这条代理可匹配多种格式，请选择具体格式后解析');
 try{return {protocol:fallback,...endpoint(text),username:'',password:''};}catch{throw new Error('无法识别代理，请选择对应格式或手动填写');}
}
