import React, { createContext, useState, useCallback, useRef, useEffect } from "react";

export const ModalContext = createContext({});

const Icons = {
  success: () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(34,197,94,0.12)",border:"2px solid rgba(34,197,94,0.3)",margin:"0 auto 16px"}}>✅</div>),
  error:   () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(239,68,68,0.12)",border:"2px solid rgba(239,68,68,0.3)",margin:"0 auto 16px"}}>⚠️</div>),
  warning: () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(245,158,11,0.12)",border:"2px solid rgba(245,158,11,0.3)",margin:"0 auto 16px"}}>⚠️</div>),
  info:    () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(59,130,246,0.12)",border:"2px solid rgba(59,130,246,0.3)",margin:"0 auto 16px"}}>ℹ️</div>),
  delete:  () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(239,68,68,0.12)",border:"2px solid rgba(239,68,68,0.3)",margin:"0 auto 16px"}}>🗑️</div>),
  confirm: () => (<div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",background:"rgba(245,158,11,0.12)",border:"2px solid rgba(245,158,11,0.3)",margin:"0 auto 16px"}}>❓</div>),
};

const AdminModalBase = ({ modal, onClose }) => {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t); }, []);
  useEffect(() => { if (modal.type === "prompt" && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150); }, [modal.type]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") handleClose(null); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);
  const handleClose = (r) => { setVisible(false); setTimeout(() => onClose(r), 250); };
  const handleConfirm = () => { if (modal.type === "prompt") handleClose(inputValue.trim()||null); else handleClose(true); };
  const IC = Icons[modal.iconType || modal.type] || Icons.info;
  const overlay = { position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",backdropFilter:"blur(8px)",background:visible?"rgba(0,0,0,0.75)":"rgba(0,0,0,0)",transition:"background 0.25s ease" };
  const card = { opacity:visible?1:0,transform:visible?"scale(1)":"scale(0.9)",transition:"opacity 0.25s ease,transform 0.25s ease",background:"linear-gradient(135deg,#0F172A,#0d1526)",border:"1px solid #334155",borderRadius:"24px",padding:"32px",width:"100%",maxWidth:"420px",boxShadow:"0 25px 80px rgba(0,0,0,0.7)" };
  return (
    <div style={overlay} onClick={(e)=>{ if(e.target===e.currentTarget&&modal.type!=="confirm"&&modal.type!=="prompt") handleClose(null); }}>
      <div style={card}>
        <IC />
        <h2 style={{color:"#FFFFFF",fontWeight:900,fontSize:"1.2rem",textAlign:"center",margin:"0 0 10px"}}>{modal.title}</h2>
        <p style={{color:"#94A3B8",fontSize:"0.875rem",textAlign:"center",lineHeight:1.6,margin:"0 0 24px",whiteSpace:"pre-wrap"}}>{modal.message}</p>
        {modal.type==="prompt" && (
          <input ref={inputRef} type="text" value={inputValue} onChange={e=>setInputValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleConfirm();}} placeholder={modal.placeholder||"Type here..."}
            style={{width:"100%",padding:"12px 16px",borderRadius:"12px",background:"rgba(255,255,255,0.05)",border:"1px solid #334155",color:"#FFFFFF",fontSize:"0.875rem",marginBottom:"20px",outline:"none",boxSizing:"border-box"}}
            onFocus={e=>{e.target.style.borderColor="#22C55E";}} onBlur={e=>{e.target.style.borderColor="#334155";}} />
        )}
        <div style={{display:"flex",gap:"12px"}}>
          {(modal.type==="confirm"||modal.type==="prompt") && (
            <button onClick={()=>handleClose(null)} style={{flex:1,padding:"12px",borderRadius:"14px",fontWeight:700,fontSize:"0.875rem",background:"rgba(255,255,255,0.06)",border:"1px solid #334155",color:"#94A3B8",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.10)";e.currentTarget.style.color="#FFF";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#94A3B8";}}>
              ✕ Cancel
            </button>
          )}
          <button onClick={handleConfirm} style={{flex:1,padding:"12px",borderRadius:"14px",fontWeight:700,fontSize:"0.875rem",background:modal.danger?"#EF4444":"linear-gradient(135deg,#22C55E,#16A34A)",border:"none",color:"#FFFFFF",cursor:"pointer",boxShadow:modal.danger?"0 4px 16px rgba(239,68,68,0.35)":"0 4px 16px rgba(34,197,94,0.35)"}}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.88";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}}>
            {modal.confirmLabel||(modal.type==="confirm"?(modal.danger?"🗑️ Delete":"✓ Confirm"):"OK")}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserModalBase = ({ modal, onClose }) => {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t); }, []);
  useEffect(() => { if (modal.type === "prompt" && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150); }, [modal.type]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") handleClose(null); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);
  const handleClose = (r) => { setVisible(false); setTimeout(() => onClose(r), 250); };
  const handleConfirm = () => { if (modal.type === "prompt") handleClose(inputValue.trim()||null); else handleClose(true); };
  const IC = Icons[modal.iconType || modal.type] || Icons.info;
  const accentMap = { success:"#22C55E",error:"#EF4444",warning:"#F59E0B",info:"#3B82F6",confirm:"#F59E0B",delete:"#EF4444" };
  const accent = accentMap[modal.iconType || modal.type] || "#22C55E";
  const overlay = { position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",backdropFilter:"blur(6px)",background:visible?"rgba(0,0,0,0.55)":"rgba(0,0,0,0)",transition:"background 0.25s ease" };
  const card = { opacity:visible?1:0,transform:visible?"scale(1)":"scale(0.9)",transition:"opacity 0.25s ease,transform 0.25s ease",background:"#FFFFFF",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"400px",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",borderTop:`4px solid ${accent}` };
  return (
    <div style={overlay} onClick={(e)=>{ if(e.target===e.currentTarget&&modal.type!=="confirm"&&modal.type!=="prompt") handleClose(null); }}>
      <div style={card}>
        <IC />
        <h2 style={{color:"#111827",fontWeight:800,fontSize:"1.1rem",textAlign:"center",margin:"0 0 8px"}}>{modal.title}</h2>
        <p style={{color:"#6B7280",fontSize:"0.875rem",textAlign:"center",lineHeight:1.6,margin:"0 0 24px",whiteSpace:"pre-wrap"}}>{modal.message}</p>
        {modal.type==="prompt" && (
          <input ref={inputRef} type="text" value={inputValue} onChange={e=>setInputValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleConfirm();}} placeholder={modal.placeholder||"Type here..."}
            style={{width:"100%",padding:"11px 14px",borderRadius:"10px",border:"1.5px solid #E5E7EB",fontSize:"0.875rem",marginBottom:"18px",color:"#111827",outline:"none",boxSizing:"border-box"}}
            onFocus={e=>{e.target.style.borderColor="#22C55E";}} onBlur={e=>{e.target.style.borderColor="#E5E7EB";}} />
        )}
        <div style={{display:"flex",gap:"10px"}}>
          {(modal.type==="confirm"||modal.type==="prompt") && (
            <button onClick={()=>handleClose(null)} style={{flex:1,padding:"11px",borderRadius:"12px",fontWeight:700,fontSize:"0.875rem",background:"#F3F4F6",border:"none",color:"#374151",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#E5E7EB";}} onMouseLeave={e=>{e.currentTarget.style.background="#F3F4F6";}}>
              Cancel
            </button>
          )}
          <button onClick={handleConfirm} style={{flex:1,padding:"11px",borderRadius:"12px",fontWeight:700,fontSize:"0.875rem",background:modal.danger?"#EF4444":"#22C55E",border:"none",color:"#FFFFFF",cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.88";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
            {modal.confirmLabel||(modal.type==="confirm"?(modal.danger?"Remove":"Confirm"):"OK")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastNotification = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  const s = { success:{bg:"#22C55E",icon:"✅"}, error:{bg:"#EF4444",icon:"❌"}, warning:{bg:"#F59E0B",icon:"⚠️"}, info:{bg:"#3B82F6",icon:"ℹ️"} };
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9998,display:"flex",flexDirection:"column",gap:8,maxWidth:340}}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}`}</style>
      {toasts.map(t => {
        const st = s[t.type]||s.info;
        return (
          <div key={t.id} onClick={()=>removeToast(t.id)} style={{background:"#FFFFFF",borderRadius:14,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${st.bg}`,animation:"slideInRight 0.3s ease"}}>
            <span style={{fontSize:"1.2rem"}}>{st.icon}</span>
            <div>
              {t.title && <p style={{fontWeight:700,fontSize:"0.8rem",color:"#111827",margin:0}}>{t.title}</p>}
              <p style={{fontSize:"0.78rem",color:"#6B7280",margin:0,marginTop:t.title?2:0}}>{t.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolveRef = useRef(null);

  const openModal = useCallback((config) => new Promise(resolve => { resolveRef.current = resolve; setModal(config); }), []);
  const closeModal = useCallback((result) => { setModal(null); if(resolveRef.current){resolveRef.current(result);resolveRef.current=null;} }, []);
  const removeToast = useCallback((id) => setToasts(p=>p.filter(t=>t.id!==id)), []);
  const addToast = useCallback((type,title,message,dur=3500) => { const id=Date.now()+Math.random(); setToasts(p=>[...p,{id,type,title,message}]); setTimeout(()=>removeToast(id),dur); }, [removeToast]);

  const adminAlert   = useCallback((a,b,c) => {
    const is3 = c !== undefined;
    const iconType = is3 ? a : 'info';
    const title = is3 ? b : a;
    const message = is3 ? c : b;
    return openModal({theme:"admin",type:"alert",iconType,title,message});
  }, [openModal]);
  const adminConfirm = useCallback((title,msg,opts={}) => openModal({theme:"admin",type:"confirm",iconType:opts.danger?"delete":"confirm",title,message:msg,danger:opts.danger,confirmLabel:opts.confirmLabel}), [openModal]);
  const adminPrompt  = useCallback((title,msg,opts={}) => openModal({theme:"admin",type:"prompt",iconType:"info",title,message:msg,placeholder:opts.placeholder}), [openModal]);
  const userAlert    = useCallback((a,b,c) => {
    const is3 = c !== undefined;
    const iconType = is3 ? (['success','error','warning','info'].includes(a) ? a : 'info') : 'info';
    const title = is3 ? b : a;
    const message = is3 ? c : b;
    return openModal({theme:"user",type:"alert",iconType,title,message});
  }, [openModal]);
  const userConfirm  = useCallback((title,msg,opts={}) => openModal({theme:"user",type:"confirm",iconType:opts.danger?"delete":"confirm",title,message:msg,danger:opts.danger,confirmLabel:opts.confirmLabel}), [openModal]);
  const userPrompt   = useCallback((title,msg,opts={}) => openModal({theme:"user",type:"prompt",iconType:"info",title,message:msg,placeholder:opts.placeholder}), [openModal]);
  const toast        = useCallback((a,b,c) => {
    const is3 = c !== undefined;
    const type = is3 ? (['success','error','warning','info'].includes(a) ? a : 'info') : 'success';
    const title = is3 ? b : a;
    const message = is3 ? c : b;
    addToast(type, title, message);
  }, [addToast]);

  return (
    <ModalContext.Provider value={{adminAlert,adminConfirm,adminPrompt,userAlert,userConfirm,userPrompt,toast}}>
      {children}
      {modal && (modal.theme==="admin" ? <AdminModalBase modal={modal} onClose={closeModal}/> : <UserModalBase modal={modal} onClose={closeModal}/>)}
      <ToastNotification toasts={toasts} removeToast={removeToast}/>
    </ModalContext.Provider>
  );
};

export default ModalProvider;
