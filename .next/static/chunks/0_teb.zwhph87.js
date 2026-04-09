(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return o}});let o=e=>{}},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={DecodeError:function(){return y},MiddlewareNotFoundError:function(){return w},MissingStaticPage:function(){return x},NormalizeError:function(){return b},PageNotFoundError:function(){return v},SP:function(){return g},ST:function(){return h},WEB_VITALS:function(){return s},execOnce:function(){return i},getDisplayName:function(){return d},getLocationOrigin:function(){return c},getURL:function(){return u},isAbsoluteUrl:function(){return l},isResSent:function(){return f},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return p},stringifyError:function(){return E}};for(var a in o)Object.defineProperty(r,a,{enumerable:!0,get:o[a]});let s=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...o)=>(r||(r=!0,t=e(...o)),t)}let n=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>n.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function u(){let{href:e}=window.location,t=c();return e.substring(t.length)}function d(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function p(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let o=await e.getInitialProps(t);if(r&&f(r))return o;if(!o)throw Object.defineProperty(Error(`"${d(e)}.getInitialProps()" should resolve to an object. But found "${o}" instead.`),"__NEXT_ERROR_CODE",{value:"E1025",enumerable:!1,configurable:!0});return o}let g="u">typeof performance,h=g&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class y extends Error{}class b extends Error{}class v extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class x extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class w extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function E(e){return JSON.stringify({message:e.message,stack:e.stack})}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={assign:function(){return l},searchParamsToUrlQuery:function(){return s},urlQueryToSearchParams:function(){return n}};for(var a in o)Object.defineProperty(r,a,{enumerable:!0,get:o[a]});function s(e){let t={};for(let[r,o]of e.entries()){let e=t[r];void 0===e?t[r]=o:Array.isArray(e)?e.push(o):t[r]=[e,o]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function n(e){let t=new URLSearchParams;for(let[r,o]of Object.entries(e))if(Array.isArray(o))for(let e of o)t.append(r,i(e));else t.set(r,i(o));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,o]of r.entries())e.append(t,o)}return e}},54338,e=>{"use strict";let t=null;function r(){let e=localStorage.getItem("access_token"),t=null,r=!1;try{let e=localStorage.getItem("auth_user");if(e){let o=JSON.parse(e);o&&("object"==typeof o.rol&&null!==o.rol&&(o.rol=o.rol.nombre||"usuario"),"object"==typeof o.empresa&&null!==o.empresa&&(o.empresa=o.empresa.nombre||"Empresa"),t=o,r=!0)}}catch{}let o={token:e,user:t,initialized:r,setAuth(e,t){t&&("object"==typeof t.rol&&null!==t.rol&&(t.rol=t.rol.nombre||"usuario"),"object"==typeof t.empresa&&null!==t.empresa&&(t.empresa=t.empresa.nombre||"Empresa")),o.token=e,o.user=t,o.initialized=!0,localStorage.setItem("access_token",e),localStorage.setItem("auth_user",JSON.stringify(t))},clearAuth(){o.token=null,o.user=null,o.initialized=!0,localStorage.removeItem("access_token"),localStorage.removeItem("auth_user"),document.cookie="access_token=; Max-Age=0; path=/;",document.cookie="refresh_token=; Max-Age=0; path=/;"},isAdmin:()=>o.user?.rol==="admin",setInitialized(e){o.initialized=e},async forceLogout(){console.log("[Auth] Forcing full logout..."),o.clearAuth();try{await fetch("/api/auth/logout",{method:"POST"})}catch(e){console.error("[Auth] Error clearing cookies during logout:",e)}window.location.href="/login"},async refreshSession(){try{let e=await a("/api/auth/me");if(e.ok){let{user:t}=await e.json();o.user=t,localStorage.setItem("auth_user",JSON.stringify(t))}else 401===e.status&&o.clearAuth()}catch(e){console.error("Error refreshing session:",e)}finally{o.initialized=!0}}};return o}function o(){return t||(t=r()),t}async function a(e,t={}){let r=o(),s=new Headers(t.headers);r.token&&!s.has("Authorization")&&s.set("Authorization",`Bearer ${r.token}`);let i=await fetch(e,{...t,headers:s});if(401===i.status){console.log(`[apiFetch] 401 on ${e}, attempting refresh...`);let o=await fetch("/api/auth/refresh",{method:"POST"});if(!o.ok)return console.warn("[apiFetch] Refresh failed, forcing logout"),await r.forceLogout(),new Response(null,{status:401,statusText:"Unauthorized - Refresh Failed"});{console.log(`[apiFetch] Refresh successful, retrying ${e}`);let{accessToken:a}=await o.json();r.setAuth(a,r.user);let s=new Headers(t.headers);return s.set("Authorization",`Bearer ${a}`),fetch(e,{...t,headers:s})}}return i}e.s(["apiFetch",0,a,"getAuthStore",0,o,"useAuthStore",0,function(e){return t||(t=r()),e(t)}])},5766,e=>{"use strict";let t,r;var o,a=e.i(71645);let s={data:""},i=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,n=/\/\*[^]*?\*\/|  +/g,l=/\n+/g,c=(e,t)=>{let r="",o="",a="";for(let s in e){let i=e[s];"@"==s[0]?"i"==s[1]?r=s+" "+i+";":o+="f"==s[1]?c(i,s):s+"{"+c(i,"k"==s[1]?"":t)+"}":"object"==typeof i?o+=c(i,t?t.replace(/([^,])+/g,e=>s.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):s):null!=i&&(s=/^--/.test(s)?s:s.replace(/[A-Z]/g,"-$&").toLowerCase(),a+=c.p?c.p(s,i):s+":"+i+";")}return r+(t&&a?t+"{"+a+"}":a)+o},u={},d=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+d(e[r]);return t}return e};function f(e){let t,r,o=this||{},a=e.call?e(o.p):e;return((e,t,r,o,a)=>{var s;let f=d(e),p=u[f]||(u[f]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(f));if(!u[p]){let t=f!==e?e:(e=>{let t,r,o=[{}];for(;t=i.exec(e.replace(n,""));)t[4]?o.shift():t[3]?(r=t[3].replace(l," ").trim(),o.unshift(o[0][r]=o[0][r]||{})):o[0][t[1]]=t[2].replace(l," ").trim();return o[0]})(e);u[p]=c(a?{["@keyframes "+p]:t}:t,r?"":"."+p)}let m=r&&u.g?u.g:null;return r&&(u.g=u[p]),s=u[p],m?t.data=t.data.replace(m,s):-1===t.data.indexOf(s)&&(t.data=o?s+t.data:t.data+s),p})(a.unshift?a.raw?(t=[].slice.call(arguments,1),r=o.p,a.reduce((e,o,a)=>{let s=t[a];if(s&&s.call){let e=s(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;s=t?"."+t:e&&"object"==typeof e?e.props?"":c(e,""):!1===e?"":e}return e+o+(null==s?"":s)},"")):a.reduce((e,t)=>Object.assign(e,t&&t.call?t(o.p):t),{}):a,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||s})(o.target),o.g,o.o,o.k)}f.bind({g:1});let p,m,g,h=f.bind({k:1});function y(e,t){let r=this||{};return function(){let o=arguments;function a(s,i){let n=Object.assign({},s),l=n.className||a.className;r.p=Object.assign({theme:m&&m()},n),r.o=/ *go\d+/.test(l),n.className=f.apply(r,o)+(l?" "+l:""),t&&(n.ref=i);let c=e;return e[0]&&(c=n.as||e,delete n.as),g&&c[0]&&g(n),p(c,n)}return t?t(a):a}}var b=(e,t)=>"function"==typeof e?e(t):e,v=(t=0,()=>(++t).toString()),x=()=>{if(void 0===r&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");r=!e||e.matches}return r},w="default",E=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:o}=t;return E(e,{type:+!!e.toasts.find(e=>e.id===o.id),toast:o});case 3:let{toastId:a}=t;return{...e,toasts:e.toasts.map(e=>e.id===a||void 0===a?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let s=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+s}))}}},k=[],A={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},S={},O=(e,t=w)=>{S[t]=E(S[t]||A,e),k.forEach(([e,r])=>{e===t&&r(S[t])})},P=e=>Object.keys(S).forEach(t=>O(e,t)),$=(e=w)=>t=>{O(t,e)},j={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},N=(e={},t=w)=>{let[r,o]=(0,a.useState)(S[t]||A),s=(0,a.useRef)(S[t]);(0,a.useEffect)(()=>(s.current!==S[t]&&o(S[t]),k.push([t,o]),()=>{let e=k.findIndex(([e])=>e===t);e>-1&&k.splice(e,1)}),[t]);let i=r.toasts.map(t=>{var r,o,a;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(r=e[t.type])?void 0:r.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(o=e[t.type])?void 0:o.duration)||(null==e?void 0:e.duration)||j[t.type],style:{...e.style,...null==(a=e[t.type])?void 0:a.style,...t.style}}});return{...r,toasts:i}},I=e=>(t,r)=>{let o,a=((e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||v()}))(t,e,r);return $(a.toasterId||(o=a.id,Object.keys(S).find(e=>S[e].toasts.some(e=>e.id===o))))({type:2,toast:a}),a.id},T=(e,t)=>I("blank")(e,t);T.error=I("error"),T.success=I("success"),T.loading=I("loading"),T.custom=I("custom"),T.dismiss=(e,t)=>{let r={type:3,toastId:e};t?$(t)(r):P(r)},T.dismissAll=e=>T.dismiss(void 0,e),T.remove=(e,t)=>{let r={type:4,toastId:e};t?$(t)(r):P(r)},T.removeAll=e=>T.remove(void 0,e),T.promise=(e,t,r)=>{let o=T.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let a=t.success?b(t.success,e):void 0;return a?T.success(a,{id:o,...r,...null==r?void 0:r.success}):T.dismiss(o),e}).catch(e=>{let a=t.error?b(t.error,e):void 0;a?T.error(a,{id:o,...r,...null==r?void 0:r.error}):T.dismiss(o)}),e};var _=1e3,C=(e,t="default")=>{let{toasts:r,pausedAt:o}=N(e,t),s=(0,a.useRef)(new Map).current,i=(0,a.useCallback)((e,t=_)=>{if(s.has(e))return;let r=setTimeout(()=>{s.delete(e),n({type:4,toastId:e})},t);s.set(e,r)},[]);(0,a.useEffect)(()=>{if(o)return;let e=Date.now(),a=r.map(r=>{if(r.duration===1/0)return;let o=(r.duration||0)+r.pauseDuration-(e-r.createdAt);if(o<0){r.visible&&T.dismiss(r.id);return}return setTimeout(()=>T.dismiss(r.id,t),o)});return()=>{a.forEach(e=>e&&clearTimeout(e))}},[r,o,t]);let n=(0,a.useCallback)($(t),[t]),l=(0,a.useCallback)(()=>{n({type:5,time:Date.now()})},[n]),c=(0,a.useCallback)((e,t)=>{n({type:1,toast:{id:e,height:t}})},[n]),u=(0,a.useCallback)(()=>{o&&n({type:6,time:Date.now()})},[o,n]),d=(0,a.useCallback)((e,t)=>{let{reverseOrder:o=!1,gutter:a=8,defaultPosition:s}=t||{},i=r.filter(t=>(t.position||s)===(e.position||s)&&t.height),n=i.findIndex(t=>t.id===e.id),l=i.filter((e,t)=>t<n&&e.visible).length;return i.filter(e=>e.visible).slice(...o?[l+1]:[0,l]).reduce((e,t)=>e+(t.height||0)+a,0)},[r]);return(0,a.useEffect)(()=>{r.forEach(e=>{if(e.dismissed)i(e.id,e.removeDelay);else{let t=s.get(e.id);t&&(clearTimeout(t),s.delete(e.id))}})},[r,i]),{toasts:r,handlers:{updateHeight:c,startPause:l,endPause:u,calculateOffset:d}}},z=h`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,D=h`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,F=h`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,R=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${z} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${D} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${F} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,L=h`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,M=y("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${L} 1s linear infinite;
`,B=h`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,U=h`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,H=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${B} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${U} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,J=y("div")`
  position: absolute;
`,Z=y("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,K=h`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Q=y("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${K} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,V=({toast:e})=>{let{icon:t,type:r,iconTheme:o}=e;return void 0!==t?"string"==typeof t?a.createElement(Q,null,t):t:"blank"===r?null:a.createElement(Z,null,a.createElement(M,{...o}),"loading"!==r&&a.createElement(J,null,"error"===r?a.createElement(R,{...o}):a.createElement(H,{...o})))},q=y("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,G=y("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,W=a.memo(({toast:e,position:t,style:r,children:o})=>{let s=e.height?((e,t)=>{let r=e.includes("top")?1:-1,[o,a]=x()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*r}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*r}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${h(o)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${h(a)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},i=a.createElement(V,{toast:e}),n=a.createElement(G,{...e.ariaProps},b(e.message,e));return a.createElement(q,{className:e.className,style:{...s,...r,...e.style}},"function"==typeof o?o({icon:i,message:n}):a.createElement(a.Fragment,null,i,n))});o=a.createElement,c.p=void 0,p=o,m=void 0,g=void 0;var X=({id:e,className:t,style:r,onHeightUpdate:o,children:s})=>{let i=a.useCallback(t=>{if(t){let r=()=>{o(e,t.getBoundingClientRect().height)};r(),new MutationObserver(r).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,o]);return a.createElement("div",{ref:i,className:t,style:r},s)},Y=f`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;e.s(["CheckmarkIcon",0,H,"ErrorIcon",0,R,"LoaderIcon",0,M,"ToastBar",0,W,"ToastIcon",0,V,"Toaster",0,({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:o,children:s,toasterId:i,containerStyle:n,containerClassName:l})=>{let{toasts:c,handlers:u}=C(r,i);return a.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...n},className:l,onMouseEnter:u.startPause,onMouseLeave:u.endPause},c.map(r=>{let i,n,l=r.position||t,c=u.calculateOffset(r,{reverseOrder:e,gutter:o,defaultPosition:t}),d=(i=l.includes("top"),n=l.includes("center")?{justifyContent:"center"}:l.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:x()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${c*(i?1:-1)}px)`,...i?{top:0}:{bottom:0},...n});return a.createElement(X,{id:r.id,key:r.id,onHeightUpdate:u.updateHeight,className:r.visible?Y:"",style:d},"custom"===r.type?b(r.message,r):s?s(r):a.createElement(W,{toast:r,position:l}))}))},"default",0,T,"resolveValue",0,b,"toast",0,T,"useToaster",0,C,"useToasterStore",0,N],5766)},27526,e=>{"use strict";var t=e.i(71645),r=e.i(54338);e.s(["AuthRefresh",0,function(){let e=(0,r.useAuthStore)(e=>e.refreshSession),o=(0,r.useAuthStore)(e=>e.user),a=(0,r.useAuthStore)(e=>e.initialized);return(0,t.useEffect)(()=>{o||a||e()},[o,a,e]),null}])}]);