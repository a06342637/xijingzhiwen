// Pinned Playwright in-process driver supplies toImpl. Clear layout emulation
// through its native protocol; no page scripts rewrite identity or screen data.
export async function fitDesktopViewport(context:any,engine:string){
 const impl=context._connection?.toImpl?.(context);
 if(!impl)throw new Error('浏览器驱动不支持调整页面视口');
 impl._options.viewport=null;delete impl._options.screen;delete impl._options.deviceScaleFactor;
 if(engine==='firefox')await impl._browser.session.send('Browser.setDefaultViewport',{browserContextId:impl._browserContextId,viewport:null});
 await Promise.all(context.pages().map(async(page:any)=>{const native=page._connection?.toImpl?.(page);if(!native)throw new Error('无法取得页面视口');native._setEmulatedSize(undefined);page._viewportSize=null;await native.delegate.updateEmulatedViewportSize(true);if(engine==='chromium'){const session=native.delegate._mainFrameSession;if(!session?._client)throw new Error('缺少浏览器原生视口会话');await session._client.send('Emulation.clearDeviceMetricsOverride');session._metricsOverride=undefined;}}));
}
