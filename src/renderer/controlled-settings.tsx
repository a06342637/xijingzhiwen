import React,{useState} from 'react';
import type {AppSettings} from '../shared/model';
import {CONTROLLED_FEATURES,type ControlledFeatureId} from '../shared/controlled-features';

export function ControlledSettings({settings,onChanged,onError}:{settings:AppSettings;onChanged:()=>Promise<void>;onError:(message:string)=>void}){
 const [busy,setBusy]=useState('');
 async function change(id:ControlledFeatureId,enabled:boolean){if(busy)return;setBusy(id);try{const result=await window.qijing.invoke<{canceled?:boolean}>('settings.controlled',{id,enabled});if(!result.canceled)await onChanged();}catch(e){onError(String(e));}finally{setBusy('');}}
 return <section className="settings-panel controlled-settings"><div className="advanced-heading"><h3>浏览器行为与测试功能</h3><small>全部默认关闭。点击开启后还需确认；下方“功能配置”集中调整参数。关闭时已有环境下次启动也停止这些功能，不改写原配置。已运行环境需要关闭后重新启动。</small></div>{CONTROLLED_FEATURES.map(group=><div className="setting-row" key={group.id}><div><h3>{group.label}<span className={'badge '+(settings.controlledFeatures?.[group.id]?'limited':'')}>{settings.controlledFeatures?.[group.id]?'已开启':'已关闭'}</span></h3><p>{group.note}</p></div><button type="button" className="button" aria-label={group.label+(settings.controlledFeatures?.[group.id]?'关闭':'开启')} disabled={Boolean(busy)} onClick={()=>void change(group.id,!settings.controlledFeatures?.[group.id])}>{busy===group.id?'处理中…':settings.controlledFeatures?.[group.id]?'关闭':'开启并确认'}</button></div>)}</section>;
}
