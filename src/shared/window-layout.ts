export type WindowLayout='auto'|'columns'|'rows'|'grid';
export interface WindowRect {x:number;y:number;width:number;height:number}
export interface DesktopMonitor {id:string;name:string;workArea:WindowRect;primary:boolean}
export interface ProfileWindow {profileId:string;handle:string;processId:number;bounds:WindowRect;minimized:boolean}
export interface WindowInventory {monitors:DesktopMonitor[];currentMonitor:string;windows:ProfileWindow[];missing:string[]}
export function tileRects(area:WindowRect,count:number,mode:WindowLayout='auto',columns=0,gap=0):WindowRect[]{
 if(!Number.isInteger(count)||count<1||count>50)throw new Error('请选择1–50个已打开窗口');
 if(!['auto','columns','rows','grid'].includes(mode))throw new Error('排列方式无效');
 if(!Number.isInteger(columns)||columns<0||columns>50||!Number.isInteger(gap)||gap<0||gap>40)throw new Error('列数或间距无效');
 if(!Object.values(area).every(Number.isInteger)||area.width<1||area.height<1)throw new Error('桌面工作区无效');
 const cols=mode==='columns'?count:mode==='rows'?1:mode==='auto'&&count<=4?count:Math.min(count,columns||Math.ceil(Math.sqrt(count*area.width/area.height)));
 const rows=Math.ceil(count/cols),result:WindowRect[]=[];
 for(let row=0,offset=0;row<rows;row++){const n=Math.min(cols,count-offset),availableWidth=area.width-gap*(n-1),availableHeight=area.height-gap*(rows-1);if(availableWidth<n||availableHeight<rows)throw new Error('窗口数量或间距超出桌面尺寸');const y=area.y+Math.floor(row*availableHeight/rows)+row*gap,h=Math.floor((row+1)*availableHeight/rows)-Math.floor(row*availableHeight/rows);for(let col=0;col<n;col++){const x=area.x+Math.floor(col*availableWidth/n)+col*gap,w=Math.floor((col+1)*availableWidth/n)-Math.floor(col*availableWidth/n);result.push({x,y,width:w,height:h});}offset+=n;}
 return result;
}
