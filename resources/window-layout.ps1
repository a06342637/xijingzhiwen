param([switch]$Persistent)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class QijingWindows {
 public delegate bool EnumProc(IntPtr h, IntPtr p);
 public delegate bool MonitorProc(IntPtr h,IntPtr d,IntPtr r,IntPtr p);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct MONITORINFO { public int cbSize; public RECT monitor,work; public int flags; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string name; }
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumDisplayMonitors(IntPtr d,IntPtr r,MonitorProc cb,IntPtr p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern bool GetMonitorInfo(IntPtr h,ref MONITORINFO m);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h,uint cmd);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int cmd);
 [DllImport("user32.dll",SetLastError=true)] public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h,int a,out int v,int size);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h,uint flags);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int cmd);
 public static List<IntPtr> Windows(){var a=new List<IntPtr>();EnumWindows((h,p)=>{int cloaked;DwmGetWindowAttribute(h,14,out cloaked,4);if(IsWindowVisible(h)&&GetWindow(h,4)==IntPtr.Zero&&cloaked==0)a.Add(h);return true;},IntPtr.Zero);return a;}
 public static List<IntPtr> Monitors(){var a=new List<IntPtr>();EnumDisplayMonitors(IntPtr.Zero,IntPtr.Zero,(h,d,r,p)=>{a.Add(h);return true;},IntPtr.Zero);return a;}
}
'@
[void][QijingWindows]::SetThreadDpiAwarenessContext([IntPtr](-4))
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
function Invoke-WindowRequest($request) {
$binaries=@($request.targets | ForEach-Object {[IO.Path]::GetFileName($_.binary)} | Select-Object -Unique)
$processes=if($binaries.Count){$filter=($binaries | ForEach-Object {"Name='"+$_.Replace("'","''")+"'"}) -join ' OR ';@(Get-CimInstance Win32_Process -Filter $filter)}else{@()}
function TargetProcess($target) {
 $profile = [Regex]::Escape($target.profileDir)
 $pattern = if ($target.engine -eq 'firefox') { '(?:^|\s)(?:-profile|--profile)\s+"?' + $profile + '"?(?:\s|$)' } else { '(?:^|\s)--user-data-dir=(?:"' + $profile + '"|' + $profile + ')(?:\s|$)' }
 return @($processes | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.Equals($target.binary,[StringComparison]::OrdinalIgnoreCase) -and $_.CommandLine -match $pattern -and $_.CommandLine -notmatch '(?:^|\s)--type=' })
}
function WindowBounds([IntPtr]$handle) { $rect=New-Object QijingWindows+RECT;[void][QijingWindows]::GetWindowRect($handle,[ref]$rect);return @{x=$rect.Left;y=$rect.Top;width=$rect.Right-$rect.Left;height=$rect.Bottom-$rect.Top} }
$handles=[QijingWindows]::Windows()
$windows=@();$missing=@()
foreach($target in $request.targets) {
 $ids=@(TargetProcess $target | ForEach-Object { $_.ProcessId })
 $candidates=@(foreach($handle in $handles){$windowProcess=[uint32]0;[void][QijingWindows]::GetWindowThreadProcessId($handle,[ref]$windowProcess);if($ids -contains $windowProcess){$bounds=WindowBounds $handle;[PSCustomObject]@{profileId=$target.profileId;handle=$handle.ToInt64().ToString();processId=$windowProcess;bounds=$bounds;minimized=[QijingWindows]::IsIconic($handle)}}})
 $chosen=$candidates | Sort-Object @{Expression={if($_.minimized){0}else{$_.bounds.width*$_.bounds.height}};Descending=$true} | Select-Object -First 1
 if($chosen){$windows+= $chosen}else{$missing+= $target.profileId}
}
if($request.action -eq 'inventory'){
 $monitors=@(foreach($monitor in [QijingWindows]::Monitors()){$info=New-Object QijingWindows+MONITORINFO;$info.cbSize=[Runtime.InteropServices.Marshal]::SizeOf($info);[void][QijingWindows]::GetMonitorInfo($monitor,[ref]$info);[PSCustomObject]@{id=$monitor.ToInt64().ToString();name=$info.name;primary=($info.flags -band 1)-ne 0;workArea=@{x=$info.work.Left;y=$info.work.Top;width=$info.work.Right-$info.work.Left;height=$info.work.Bottom-$info.work.Top}}})
 $current=[QijingWindows]::MonitorFromWindow([QijingWindows]::GetForegroundWindow(),2).ToInt64().ToString()
 @{monitors=$monitors;currentMonitor=$current;windows=$windows;missing=$missing} | ConvertTo-Json -Depth 7 -Compress
}elseif($request.action -eq 'apply'){
 $results=@(foreach($placement in $request.placements){$matched=$windows | Where-Object { $_.profileId -eq $placement.profileId -and $_.handle -eq $placement.handle -and $_.processId -eq $placement.processId } | Select-Object -First 1
 if(!$matched){[PSCustomObject]@{profileId=$placement.profileId;ok=$false;error='window_changed'};continue}
 $handle=[IntPtr]([long]$matched.handle);if([QijingWindows]::IsIconic($handle) -or [QijingWindows]::IsZoomed($handle)){[void][QijingWindows]::ShowWindowAsync($handle,9)}$r=$placement.bounds
 $success=[QijingWindows]::SetWindowPos($handle,[IntPtr]::Zero,$r.x,$r.y,$r.width,$r.height,0x4014)
 $actual=WindowBounds $handle
 for($attempt=0;$success -and $attempt -lt 20 -and ([Math]::Abs($actual.x-$r.x) -gt 2 -or [Math]::Abs($actual.y-$r.y) -gt 2 -or [Math]::Abs($actual.width-$r.width) -gt 2 -or [Math]::Abs($actual.height-$r.height) -gt 2);$attempt++){Start-Sleep -Milliseconds 40;if([QijingWindows]::IsZoomed($handle)){[void][QijingWindows]::ShowWindowAsync($handle,9)}$success=[QijingWindows]::SetWindowPos($handle,[IntPtr]::Zero,$r.x,$r.y,$r.width,$r.height,0x0014);$actual=WindowBounds $handle}
 [PSCustomObject]@{profileId=$placement.profileId;ok=$success;bounds=$actual;requested=$r;error=$(if(!$success){'window_position_denied'}else{''})}
 });@{results=$results} | ConvertTo-Json -Depth 7 -Compress
}else{throw 'Unsupported window operation'}

}
if($Persistent){
 while($null -ne ($line=[Console]::In.ReadLine())){
  if(!$line.Trim()){continue}
  $message=$null
  try{$message=$line|ConvertFrom-Json;$data=Invoke-WindowRequest $message.request|ConvertFrom-Json;@{id=$message.id;data=$data}|ConvertTo-Json -Depth 10 -Compress}
  catch{@{id=$message.id;error=$_.Exception.Message}|ConvertTo-Json -Depth 5 -Compress}
 }
}else{Invoke-WindowRequest ([Console]::In.ReadToEnd()|ConvertFrom-Json)}
