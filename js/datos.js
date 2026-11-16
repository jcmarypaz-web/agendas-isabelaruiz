/* =========================================================
   CAPA DE DATOS
   - Con Firebase configurado: Firestore + Authentication.
   - Sin configuración: "modo demostración" en el navegador
     (localStorage), útil para revisar el diseño y el panel.
   Colecciones:
     config/negocio      datos del negocio, portada, textos, políticas (público)
     artistas/{id}       nombre, frase, foto, estado, orden          (público)
     dias/{YYYY-MM-DD}   horas por artista, cerrado, pronto           (público)
     ocupados/{slot}     artista, fecha, hora (sin datos personales)  (público)
     citas/{id}          cita completa con datos de la clienta        (privado)
     clientas/{id}       CRM: nombre, teléfono, cumpleaños, notas     (privado)
   ========================================================= */
import { firebaseConfig } from "./firebase-config.js";
import * as SEMILLA from "./semilla.js";

const FB_VER = "10.12.2";
const FB = `https://www.gstatic.com/firebasejs/${FB_VER}`;
export const modo = firebaseConfig && firebaseConfig.projectId ? "firebase" : "demo";

let fb = null;          // módulos de firebase
let fdb = null, fauth = null;

export async function iniciar() {
  if (modo === "firebase") {
    const app = await import(`${FB}/firebase-app.js`);
    const fs = await import(`${FB}/firebase-firestore.js`);
    const au = await import(`${FB}/firebase-auth.js`);
    fb = { ...fs, ...au };
    const a = app.initializeApp(firebaseConfig);
    fdb = fs.getFirestore(a);
    fauth = au.getAuth(a);
  } else {
    demoCargar();
  }
  return modo;
}

/* ---------------- utilidades ---------------- */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------------- MODO DEMO ---------------- */
const CLAVE = "agenda-sistema-demo-v2";
let demo = null;
const oyentes = new Set();

function demoCargar() {
  try { demo = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (_) { demo = null; }
  if (!demo) {
    demo = { config: {}, artistas: {}, dias: {}, ocupados: {}, citas: {}, clientas: {} };
    demo.config.negocio = structuredClone(SEMILLA.NEGOCIO);
    for (const a of SEMILLA.ARTISTAS) { const { id, ...r } = a; demo.artistas[id] = r; }
    demo.dias = structuredClone(SEMILLA.DIAS);
    demoGuardar();
  }
  window.addEventListener("storage", e => {
    if (e.key !== CLAVE) return;
    try { demo = JSON.parse(e.newValue); } catch (_) { return; }
    oyentes.forEach(o => o());
  });
}
function demoGuardar() { try { localStorage.setItem(CLAVE, JSON.stringify(demo)); } catch (e) { console.warn("No se pudo guardar en el navegador", e); } }
function demoNotificar() { demoGuardar(); oyentes.forEach(o => o()); }
export function demoReiniciar() { try { localStorage.removeItem(CLAVE); } catch (_) {} demo = null; demoCargar(); oyentes.forEach(o => o()); }

function cumple(d, f) {
  if (!f) return true;
  const v = d[f.campo];
  switch (f.op) { case ">=": return v >= f.valor; case "<=": return v <= f.valor; case "==": return v === f.valor; default: return true; }
}

/* ---------------- LECTURA EN VIVO ----------------
   escuchar("artistas", lista => …)               → [{id, …datos}]
   escuchar("config/negocio", doc => …)           → {…datos} | null
   filtro opcional: {campo, op, valor}  (op: ">=", "<=", "==")  */
export function escuchar(ruta, cb, filtro, alError) {
  const esDoc = ruta.split("/").length === 2;
  if (modo === "demo") {
    const correr = () => {
      if (esDoc) { const [c, i] = ruta.split("/"); const d = demo[c] && demo[c][i]; cb(d ? structuredClone(d) : null); }
      else cb(Object.entries(demo[ruta] || {}).map(([id, d]) => ({ id, ...structuredClone(d) })).filter(d => cumple(d, filtro)));
    };
    oyentes.add(correr); setTimeout(correr, 0);
    return () => oyentes.delete(correr);
  }
  if (esDoc) {
    return fb.onSnapshot(fb.doc(fdb, ruta), s => cb(s.exists() ? s.data() : null), e => alError && alError(e));
  }
  let q = fb.collection(fdb, ruta);
  if (filtro) q = fb.query(q, fb.where(filtro.campo, filtro.op, filtro.valor));
  return fb.onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => alError && alError(e));
}

/* ---------------- ESCRITURA ----------------
   lote([{op:"set"|"merge"|"delete", ruta:"coleccion/id", datos}])  — todo o nada */
export async function lote(ops) {
  if (modo === "demo") {
    for (const o of ops) {
      const [c, i] = o.ruta.split("/");
      demo[c] = demo[c] || {};
      if (o.op === "delete") delete demo[c][i];
      else if (o.op === "merge") demo[c][i] = { ...(demo[c][i] || {}), ...structuredClone(o.datos) };
      else demo[c][i] = structuredClone(o.datos);
    }
    demoNotificar();
    return;
  }
  const b = fb.writeBatch(fdb);
  for (const o of ops) {
    const r = fb.doc(fdb, o.ruta);
    if (o.op === "delete") b.delete(r);
    else if (o.op === "merge") b.set(r, o.datos, { merge: true });
    else b.set(r, o.datos);
  }
  await b.commit();
}
export const guardar = (ruta, datos, unir = false) => lote([{ op: unir ? "merge" : "set", ruta, datos }]);
export const borrar = ruta => lote([{ op: "delete", ruta }]);

/* Carga los datos iniciales en Firebase si la base está vacía (solo panel). */
export async function sembrarSiVacio() {
  if (modo === "demo") return false;
  const s = await fb.getDoc(fb.doc(fdb, "config/negocio"));
  if (s.exists()) return false;
  const ops = [{ op: "set", ruta: "config/negocio", datos: SEMILLA.NEGOCIO }];
  for (const a of SEMILLA.ARTISTAS) { const { id, ...r } = a; ops.push({ op: "set", ruta: "artistas/" + id, datos: r }); }
  for (const [k, v] of Object.entries(SEMILLA.DIAS)) ops.push({ op: "set", ruta: "dias/" + k, datos: v });
  for (let i = 0; i < ops.length; i += 400) await lote(ops.slice(i, i + 400));
  return true;
}

/* ---------------- SESIÓN (panel) ---------------- */
export function alCambiarSesion(cb) {
  if (modo === "demo") {
    const v = sessionStorageGet();
    setTimeout(() => cb(v ? { email: "demo@redyz" } : null), 0);
    alCambiarSesion._cb = cb; return () => {};
  }
  return fb.onAuthStateChanged(fauth, u => cb(u ? { email: u.email } : null));
}
export async function entrar(correo, clave) {
  if (modo === "demo") { sessionStorageSet(true); alCambiarSesion._cb && alCambiarSesion._cb({ email: "demo@redyz" }); return; }
  await fb.signInWithEmailAndPassword(fauth, correo, clave);
}
export async function salir() {
  if (modo === "demo") { sessionStorageSet(false); alCambiarSesion._cb && alCambiarSesion._cb(null); return; }
  await fb.signOut(fauth);
}
/* La secretaria crea (o recupera) su propia contraseña: Firebase le envía un correo
   con un enlace para escribirla. La cuenta (solo el correo) la agrega Redyz en
   Authentication → Usuarios; nadie más conoce la contraseña. */
export async function enviarEnlaceClave(correo) {
  if (modo === "demo") return;
  fauth.languageCode = "es";
  const url = location.href.split(/[?#]/)[0];
  try { await fb.sendPasswordResetEmail(fauth, correo, { url }); }
  catch (e) { if (e && e.code === "auth/unauthorized-continue-uri") await fb.sendPasswordResetEmail(fauth, correo); else throw e; }
}
/* Cambiar la contraseña con la sesión abierta (pide la actual por seguridad). */
export async function cambiarClave(actual, nueva) {
  if (modo === "demo") return;
  const u = fauth.currentUser; if (!u) throw new Error("sin-sesion");
  await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, actual));
  await fb.updatePassword(u, nueva);
}
function sessionStorageGet() { try { return sessionStorage.getItem("agenda-demo-sesion") === "1"; } catch (_) { return window.__sesionDemo === true; } }
function sessionStorageSet(v) { try { v ? sessionStorage.setItem("agenda-demo-sesion", "1") : sessionStorage.removeItem("agenda-demo-sesion"); } catch (_) { window.__sesionDemo = v; } }

/* ---------------- IMÁGENES ----------------
   Comprime una foto subida para guardarla dentro de la base de datos. */
export function comprimirImagen(archivo, lado = 720, calidad = 0.82) {
  return new Promise((ok, mal) => {
    const lector = new FileReader();
    lector.onerror = () => mal(new Error("No se pudo leer la imagen"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => mal(new Error("El archivo no es una imagen válida"));
      img.onload = () => {
        const esc = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/webp", calidad);
        if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", calidad);
        ok(url);
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}
