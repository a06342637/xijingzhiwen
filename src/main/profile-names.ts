import {randomBytes,randomInt} from 'node:crypto';
const adjectives=['晴朗','清风','暖阳','星光','晨曦','月白','碧蓝','轻盈','云间','远山','银色','青翠','静谧','明亮','澄澈','和煦','春日','秋枫','夏雨','冬雪','流光','微风','悠然','飞扬','朦胧','沐光','霁月','苍穹','柔和','朗月'];
const nouns=['山川','森林','海湾','溪流','原野','小岛','云朵','星河','湖畔','花园','竹林','港湾','山谷','绿洲','白鹭','青鸟','灯塔','远帆','沙丘','清泉','松林','稻田','晨露','海岸','雪峰','麦浪','云海','长空','月影','雨林'];
export function randomProfileName(existing:Iterable<string>=[]){const used=new Set(existing);let name:string;do{name=adjectives[randomInt(adjectives.length)]+nouns[randomInt(nouns.length)]+'-'+randomBytes(6).toString('hex');}while(used.has(name));return name;}
