import {randomInt} from 'node:crypto';
const alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function randomProfileName(existing:Iterable<string>=[],date=new Date()){
 const used=new Set(existing),pad=(n:number)=>String(n).padStart(2,'0');
 const stamp=`${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
 let name:string;do{name=Array.from({length:4},()=>alphabet[randomInt(alphabet.length)]).join('')+'-'+stamp;}while(used.has(name));return name;
}
