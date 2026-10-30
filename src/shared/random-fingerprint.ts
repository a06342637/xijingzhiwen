import type {Values} from './model';

// Keep network/locale and experimental choices explicit. Randomize only coherent,
// supported Windows personas; every environment also receives its own uint64 seed.
export function randomFingerprint(base:Values,random:()=>number=Math.random):Values {
 const pick=<T,>(items:T[])=>items[Math.floor(random()*items.length)];
 const [screenWidth,screenHeight]=pick([[1920,1080],[2560,1440],[1536,864],[1600,900],[1366,768]]);
 const [cpu,memory]=pick([[4,'4'],[8,'8'],[12,'16'],[16,'16'],[8,'16']] as const);
 const touch=pick([0,0,0,10]);
 return {...base,identityMode:'seeded',platform:'windows',brand:pick(['Chrome','Edge']),brandVersion:'',platformVersion:pick(['10.0.0','15.0.0']),userAgent:'',cpu,memory,screenWidth,screenHeight,taskbarHeight:pick([40,48]),windowWidth:Math.min(1280,screenWidth-80),windowHeight:Math.min(860,screenHeight-100),maximized:false,viewportMode:'native',viewportWidth:Math.min(1200,screenWidth-80),viewportHeight:Math.min(720,screenHeight-160),touch,pointer:'fine',hover:'hover',colorScheme:pick(['light','dark']),contrast:'native',forcedColors:'native','reduced-motion':pick(['native','true']),'reduced-transparency':'native','inverted-colors':'native',timer:0,gpuBackend:'native',gpuVendor:'',gpuRenderer:'',noise:true,pixelNoise:'seeded',audioRender:'isolated',audioSeed:'',fontPolicy:'native',fontWhitelist:'',windowsFontMetrics:false};
}
