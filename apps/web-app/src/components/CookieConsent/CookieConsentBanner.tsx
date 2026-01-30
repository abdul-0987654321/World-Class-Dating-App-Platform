/**
 * Cookie Consent Banner - GDPR/CCPA/LGPD Compliant
 * Granular consent, GPC detection, cookie removal, localStorage persistence
 */

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const CONSENT_VERSION = "1.0.0";
const STORAGE_KEY = "flamoral_cookie_consent";

export interface CookieConsent {
  version: string;
  timestamp: string;
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  gpcDetected: boolean;
}

const DEFAULT_CONSENT: CookieConsent = {
  version: CONSENT_VERSION,
  timestamp: new Date().toISOString(),
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  gpcDetected: false,
};

function getGPCSignal(): boolean {
  if (typeof navigator !== "undefined" && "globalPrivacyControl" in navigator) {
    return !!(navigator as any).globalPrivacyControl;
  }
  return false;
}

function getSavedConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: CookieConsent = JSON.parse(stored);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("flamoral:consent-changed", { detail: consent }));
  } catch {
    // localStorage unavailable
  }
}

function removeNonEssentialCookies(consent: CookieConsent): void {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("_session") || name.startsWith("csrf") || name === "flamoral_auth") continue;
    if (!consent.analytics && (name.startsWith("_ga") || name.startsWith("_gid") || name.startsWith("_gtag"))) {
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    if (!consent.marketing && (name.startsWith("_fb") || name.startsWith("_gcl") || name.startsWith("ads_"))) {
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  }
}
export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);const[sd,setSd]=useState(false);const[co,setCo]=useState({...DEFAULT_CONSENT} as CookieConsent);
  useEffect(()=>{const sv=getSavedConsent(),g=getGPCSignal();if(sv){if(g&&!sv.gpcDetected)saveConsent({...sv,analytics:false,marketing:false,gpcDetected:true,timestamp:new Date().toISOString()});setVisible(false)}else{if(g)setCo({...DEFAULT_CONSENT,functional:true,gpcDetected:true});setVisible(true)}},[]);
  const acc=useCallback(()=>{const g=getGPCSignal();saveConsent({version:CONSENT_VERSION,timestamp:new Date().toISOString(),essential:true,functional:true,analytics:!g,marketing:!g,gpcDetected:g});setVisible(false)},[]);const rej=useCallback(()=>{saveConsent({version:CONSENT_VERSION,timestamp:new Date().toISOString(),essential:true,functional:false,analytics:false,marketing:false,gpcDetected:getGPCSignal()});setVisible(false)},[]);const sav=useCallback(()=>{const g=getGPCSignal();saveConsent({...co,version:CONSENT_VERSION,timestamp:new Date().toISOString(),essential:true,analytics:g?false:co.analytics,marketing:g?false:co.marketing,gpcDetected:g});setVisible(false)},[co]);
  const tog = useCallback((k: any) => setCo((p: any) => ({...p, [k]: !p[k]})), []);
  if(!visible)return null;
  return(<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9999,background:"rgba(20,20,31,.98)",borderTop:"1px solid rgba(236,72,153,.3)",padding:"1.5rem",backdropFilter:"blur(20px)"}} role="dialog" aria-label="Cookie consent"><div style={{maxWidth:1200,margin:"0 auto"}}><h3 style={{color:"#f3f4f6",margin:"0 0 .5rem",fontSize:"1.25rem",fontWeight:700}}>We value your privacy{co.gpcDetected&&<span style={{marginLeft:8,background:"rgba(59,130,246,.2)",color:"#60a5fa",fontSize:".75rem",padding:".2rem .5rem",borderRadius:4}}>GPC</span>}</h3>
<p style={{color:"#9ca3af",fontSize:".9rem",margin:"0 0 1rem"}}>We use cookies. <a href="/cookie-policy" style={{color:"#ec4899"}}>Cookie Policy</a> | <a href="/privacy-policy" style={{color:"#ec4899"}}>Privacy Policy</a></p>{co.gpcDetected&&<p style={{color:"#93c5fd",fontSize:".85rem",background:"rgba(59,130,246,.1)",padding:".75rem",borderRadius:8,marginBottom:"1rem"}}>GPC detected - analytics/marketing cookies disabled per CCPA/CPRA.</p>}
{sd&&<div style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(255,255,255,.08)"}}>{[{n:"Essential",k:""},{n:"Functional",k:"functional"},{n:"Analytics",k:"analytics"},{n:"Marketing",k:"marketing"}].map((c,i)=>{const on=!c.k||(co as any)[c.k];const dis=!c.k||(i>=2&&co.gpcDetected);return<div key={c.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".5rem 0",borderBottom:i<3?"1px solid rgba(255,255,255,.05)":"none"}}><div><div style={{fontWeight:600,color:"#f3f4f6"}}>{c.n}</div><div style={{fontSize:".8rem",color:"#9ca3af"}}>{i===0?"Required":i===1?"Chat prefs":i===2?"Usage insights":"Ad measurement"}{dis&&i>0?" (GPC)":""}</div></div><button disabled={!!dis} onClick={()=>c.k&&!dis&&tog(c.k)} style={{width:44,height:24,borderRadius:12,background:on?"#ec4899":"rgba(255,255,255,.15)",border:"none",cursor:dis?"not-allowed":"pointer",opacity:dis?.6:1,position:"relative"}}><div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?23:3,transition:"left .2s"}}/></button></div>})}</div>}
<div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}><button onClick={()=>setSd(!sd)} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontWeight:600,fontSize:".9rem"}}>{sd?"Hide Details":"Manage Preferences"}</button><button onClick={rej} style={{padding:".5rem 1rem",borderRadius:8,fontWeight:600,background:"rgba(255,255,255,.1)",color:"#d1d5db",border:"1px solid rgba(255,255,255,.15)",cursor:"pointer"}}>Reject All</button><button onClick={sd?sav:acc} style={{padding:".5rem 1rem",borderRadius:8,fontWeight:600,background:"linear-gradient(135deg,#ec4899,#d62839)",color:"#fff",border:"none",cursor:"pointer"}}>{sd?"Save Preferences":"Accept All"}</button></div></div></div>);
};
export default CookieConsentBanner;
