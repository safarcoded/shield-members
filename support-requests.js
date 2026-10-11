import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
const $ = (id) => document.getElementById(id);
const ready = Object.values(firebaseConfig).every(v => typeof v === "string" && v.trim() && !v.startsWith("REPLACE_WITH_"));
let auth = null, db = null, currentAdmin = null;
if (ready) { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }
function msg(id, text) { $(id).textContent = text; }
function failMessage(error) { return error.code === "permission-denied" ? "Access denied by Firestore Rules. Confirm the queue rules were added and published for the bootstrap admin." : `Request failed (${error.code || "unknown error"}). Check Firebase configuration and rules.`; }
function showAuth() { $("authPanel").hidden = false; $("queuePanel").hidden = true; }
function showQueue() { $("authPanel").hidden = true; $("queuePanel").hidden = false; }
function makeText(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; el.textContent = text ?? ""; return el; }
function labelType(value) { return ({"potentially-unfair-penalty":"Potentially unfair fine or penalty","administrative-charge":"Administrative / replacement charge","group-penalty":"Group penalty or mistaken identification","other":"Other related concern"})[value] || value || "Not specified"; }
function labelStatus(value) { return ({new:"New",acknowledged:"Acknowledged","under-review":"Under review",closed:"Closed"})[value] || value || "Unknown"; }
async function verifyAdmin(user) {
  const snap = await getDoc(doc(db,"userRoles",user.uid));
  if (!snap.exists() || snap.data().role !== "admin" || snap.data().approved !== true) throw new Error("This account is not approved as an administrator.");
  currentAdmin = user;
  showQueue();
  await loadRequests();
}
async function loadRequests() {
  $("requests").replaceChildren(); msg("queueMessage","Loading requests…");
  try {
    const q = query(collection(db,"supportRequests"),orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if (snap.empty) { msg("queueMessage","No support requests are recorded."); return; }
    msg("queueMessage",`${snap.size} request(s). Handle all information confidentially.`);
    snap.forEach(d => renderRequest({id:d.id,...d.data()}));
  } catch (error) { console.error(error); msg("queueMessage",failMessage(error)); }
}
function renderRequest(r) {
  const card = makeText("article","request-card","");
  card.append(makeText("h4","",r.preferredName || "Name not provided"));
  card.append(makeText("p","meta",`Reference: ${r.id}`));
  card.append(makeText("p","meta",`Email: ${r.contactEmail || "Not provided"}`));
  card.append(makeText("p","meta",`Institution: ${r.institution || "Not provided"}`));
  card.append(makeText("p","meta",`Concern: ${labelType(r.concernType)}`));
  card.append(makeText("p","meta",`Current status: ${labelStatus(r.status)}`));
  card.append(makeText("p","summary",r.summary || "No summary provided."));
  const statusLabel = makeText("label","","Update status");
  const status = document.createElement("select");
  [["new","New"],["acknowledged","Acknowledged"],["under-review","Under review"],["closed","Closed"]].forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;o.selected=r.status===v;status.append(o);});
  statusLabel.append(status); card.append(statusLabel);
  const noteLabel = makeText("label","","Internal note (max 1000 characters; never shared publicly) ");
  const note = document.createElement("textarea"); note.rows=3; note.maxLength=1000; note.value=r.internalNote || ""; noteLabel.append(note); card.append(noteLabel);
  const save = makeText("button","","Save update"); save.type="button";
  save.addEventListener("click",async()=>{
    if(!currentAdmin) return;
    save.disabled=true; msg("queueMessage","Saving update…");
    try { await updateDoc(doc(db,"supportRequests",r.id),{status:status.value,internalNote:note.value.trim(),updatedAt:serverTimestamp()}); msg("queueMessage","Update saved. Refreshing queue…"); await loadRequests(); }
    catch(e){console.error(e);msg("queueMessage",failMessage(e));save.disabled=false;}
  });
  card.append(save); $("requests").append(card);
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!ready){msg("authMessage","Set firebase-config.js first.");return;}$("loginButton").disabled=true;try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}catch(error){console.error(error);msg("authMessage",error.message||failMessage(error));}finally{$("loginButton").disabled=false;}});
$("refreshButton").addEventListener("click",loadRequests);
$("logoutButton").addEventListener("click",async()=>{if(auth) await signOut(auth);});
if(!ready) msg("authMessage","Set firebase-config.js with the Members Portal app configuration first.");
else onAuthStateChanged(auth,async user=>{if(!user){currentAdmin=null;showAuth();return;}try{await verifyAdmin(user);}catch(error){console.error(error);currentAdmin=null;showAuth();msg("authMessage",error.message||failMessage(error));await signOut(auth);}});
