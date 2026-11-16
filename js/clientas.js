/* Página pública de agendamiento */
import * as D from "./datos.js";
import { $, esc, fecha, hoyISO, horaTxt, diaLargo, rangoTxt, pasada, semanasDe, slotId, pesos, toast, nieve,
         DIAS_N, DIAS_C, MESES_C, ICONOS_POL } from "./util.js";

const S = { vista: "inicio", semana: null, artista: null, dia: null, hora: null, nombre: "", servicio: "", acepto: false, datos: false };
const B = { negocio: null, artistas: [], dias: [], ocupados: new Set(), listo: { negocio: false, artistas: false, dias: false } };

/* ---------- datos derivados ---------- */
const navidad = () => !B.negocio || B.negocio.navidad !== false;
let nieveActual = null;
function efectos() { const n = navidad(); if (n !== nieveActual) { nieveActual = n; nieve(n); } }
const artistasVisibles = () => B.artistas.filter(a => a.estado !== "oculta").sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
const artista = id => B.artistas.find(a => a.id === id);
const diaDoc = id => B.dias.find(d => d.id === id);
const horasDe = (aid, d) => { const x = diaDoc(d); if (!x || x.cerrado || x.pronto) return []; return ((x.horas || {})[aid] || []).slice().sort((a, b) => a - b); };
const ocupada = (a, d, m) => B.ocupados.has(slotId(a, d, m));
const libres = (a, d) => horasDe(a, d).filter(m => !ocupada(a, d, m) && !pasada(d, m)).length;
const semanas = () => semanasDe(B.dias, hoyISO());
const semana = id => semanas().find(s => s.id === id);
const semanaPronto = s => s.dias.every(d => d.pronto);
const semanaConCupo = s => artistasVisibles().some(a => a.estado === "activa" && s.dias.some(d => libres(a.id, d.id) > 0));
const politicas = () => (B.negocio.politicas || []).map(p => ({ ...p, p: String(p.p).replace("{abono}", `<b>${pesos(B.negocio.abono)}</b>`) }));

/* ---------- piezas ---------- */
function colgantes() {
  if (!navidad()) return "";
  const bolas = [{ l: "4%", h: 60, s: 30, c: "radial-gradient(circle at 30% 30%,#fffaf0,#F0C2B6 45%,#a8842f)" },
    { l: "13%", h: 100, s: 22, c: "radial-gradient(circle at 30% 30%,#fff,#f6e4df 50%,#d2aea6)" },
    { l: "84%", h: 85, s: 26, c: "radial-gradient(circle at 30% 30%,#fff,#f6e4df 50%,#d2aea6)" },
    { l: "93%", h: 50, s: 32, c: "radial-gradient(circle at 30% 30%,#fffaf0,#F0C2B6 45%,#a8842f)" }];
  return `<div class="colgantes" aria-hidden="true">${bolas.map((b, i) => `<div class="esfera" style="left:${b.l};animation-delay:${i * -1.1}s"><div class="hilo" style="height:${b.h}px"></div><div class="bola" style="width:${b.s}px;height:${b.s}px;background:${b.c}"></div></div>`).join("")}</div>`;
}
const politicasHTML = () => politicas().map((p, i) => `<div class="pol"><div class="ico">${ICONOS_POL[Math.min(i, ICONOS_POL.length - 1)]}</div><div><h4>${esc(p.t)}</h4><p>${p.p}</p></div></div>`).join("");
const pasos = n => `<div class="pasos" aria-label="Paso ${n} de 4">${[1, 2, 3, 4].map(i => `<span class="${i <= n ? "on" : ""}"></span>`).join("")}</div>`;
const topbar = v => `<div class="topbar"><button class="volver" data-accion="ir" data-vista="${v}">‹ Volver</button><img class="mini-logo" src="img/logo.webp" alt="${esc(B.negocio.nombre)}"></div>`;
const pie = () => `<footer><span class="script">Gracias por elegirnos</span>${esc(B.negocio.nombre)}${B.negocio.instagram ? " · " + esc(B.negocio.instagram) : ""} · WhatsApp ${esc(waTxt())}${D.modo === "demo" ? `<br><a href="panel.html" style="display:inline-block;margin-top:10px;font-size:12px;color:var(--marron)">Abrir panel de secretaria (solo en la demostración)</a>` : ""}</footer>`;
const waTxt = () => { const n = String(B.negocio.whatsapp || ""); return n.startsWith("57") ? "+57 " + n.slice(2, 5) + " " + n.slice(5, 8) + " " + n.slice(8) : "+" + n; };

/* Autorización de datos: bloques separados por línea en blanco; "# " subtítulo, "- " viñeta */
function textoLegal(t) {
  if (!t) return `<p>Tus datos se usan solo para atenderte y no se comparten con terceros.</p>`;
  return String(t).split(/\n\s*\n/).map(b => {
    const ls = b.split("\n").map(l => l.trim()).filter(Boolean); let h = "", ul = [], out = "";
    const cerrar = () => { if (ul.length) { out += `<ul>${ul.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; ul = []; } };
    for (const l of ls) {
      if (l.startsWith("# ")) { cerrar(); h += `<h4>${esc(l.slice(2))}</h4>`; }
      else if (l.startsWith("- ")) ul.push(l.slice(2));
      else { cerrar(); out += `<p>${esc(l)}</p>`; }
    }
    cerrar(); return h + out;
  }).join("");
}

/* ---------- vistas ---------- */
function vInicio() {
  const N = B.negocio, ss = semanas();
  return `<div class="vista">${colgantes()}
  <section class="hero">
    <div class="portada"><img src="${esc(N.portada || "img/portada.webp")}" alt="Nuestro equipo de ${esc(N.nombre)}"></div>
    <div class="hero-texto">
      <img class="logo" src="img/logo.webp" alt="${esc(N.nombre)}">
      <div class="eyebrow">${esc(N.eyebrow || "")}</div>
      <h1 class="titulo script"><span class="chico">${esc(N.tituloChico || "")}</span><span class="grande">${esc(N.tituloGrande || "")}</span></h1>
      ${N.bienvenida ? `<p class="pill">${esc(N.bienvenida)}</p>` : ""}
    </div>
    ${N.catalogo ? `<div><a class="btn-catalogo" href="${esc(N.catalogo)}" target="_blank" rel="noopener">Ver catálogo de servicios</a></div>` : ""}
    <button class="link-politicas" data-accion="abrir-politicas">Conoce nuestras políticas</button>
  </section>
  <div class="seccion-titulo"><div class="linea">✦</div><h2 class="script" style="margin-top:14px">Elige tu semana</h2></div>
  <p class="seccion-sub">¿Cuándo quieres consentirte?</p>
  ${ss.length ? `<div class="semanas">${ss.map((s, i) => {
    const pen = semanaPronto(s), lleno = !pen && !semanaConCupo(s), off = pen || lleno;
    const d0 = fecha(s.desde), d1 = fecha(s.hasta);
    return `<button class="semana ${pen ? "pendiente" : lleno ? "pasada" : ""}" data-accion="semana" data-id="${s.id}" ${off ? "disabled" : ""}>
      <div class="num">Semana ${i + 1}</div><div class="rango">${rangoTxt(s.desde, s.hasta)}</div>
      <div class="dias">${s.dias.length === 1 ? DIAS_N[d0.getDay()] : DIAS_N[d0.getDay()] + " a " + DIAS_N[d1.getDay()].toLowerCase()}</div>
      <span class="tag">${pen ? "Agenda próximamente" : lleno ? "Agenda llena" : "Cupos disponibles"}</span>
      <span class="entrar">${pen ? "Muy pronto" : lleno ? "Sin cupos" : "Agendar aquí ›"}</span></button>`;
  }).join("")}</div>` : `<p class="nota-suave">Muy pronto abriremos nuevas fechas. ¡Síguenos en Instagram para enterarte!</p>`}
  ${N.notaSemanas ? `<p class="nota-suave" style="margin-top:18px">${esc(N.notaSemanas)}</p>` : ""}
  ${pie()}</div>`;
}

function vArtistas() {
  const s = semana(S.semana);
  return `<div class="vista">${topbar("inicio")}${pasos(1)}
  <div class="resumen-chips"><span class="chip"><b>Semana</b> · ${rangoTxt(s.desde, s.hasta)}</span></div>
  <div class="seccion-titulo" style="margin-top:18px"><h2 class="titulo script"><span class="chico">¿Con quién quieres</span><span class="grande">brillar?</span></h2></div>
  <p class="seccion-sub">Elige a tu especialista y mira su agenda de la semana</p>
  <div class="artistas">
    ${artistasVisibles().map(a => { const ok = a.estado === "activa", tiene = ok && s.dias.some(d => horasDe(a.id, d.id).length);
      const off = !ok || !tiene;
      return `<button class="artista ${off ? "pendiente" : ""}" data-accion="artista" data-id="${esc(a.id)}" ${off ? "disabled" : ""}>
      ${CORONA_MINI}<div class="marco-p"><div class="interior"><img src="${esc(a.foto || "img/logo.webp")}" alt="${esc(a.nombre)}"><span class="cinta">${esc(a.nombre)}</span>
      <div class="frase">${esc(a.frase || "")}</div><span class="ver">${!ok ? "Agenda próximamente" : tiene ? "Ver su agenda ›" : "Sin agenda esta semana"}</span></div></div></button>`; }).join("")}
  </div>${pie()}</div>`;
}

function vAgenda() {
  const s = semana(S.semana), a = artista(S.artista);
  if (!S.dia || !s.dias.some(d => d.id === S.dia)) S.dia = (s.dias.find(d => libres(a.id, d.id) > 0) || {}).id || null;
  const dsel = S.dia;
  return `<div class="vista">${topbar("artistas")}${pasos(2)}
  <div class="perfil"><img src="${esc(a.foto)}" alt="${esc(a.nombre)}"><div style="text-align:left"><div class="script">${esc(a.nombre)}</div><div class="serif">${rangoTxt(s.desde, s.hasta)}</div></div></div>
  <div class="panel-card">
    <h3>Elige tu día</h3>
    <div class="dias-sel" role="listbox" aria-label="Días">
      ${s.dias.map(dd => { const d = dd.id, f = fecha(d), l = libres(a.id, d), off = l === 0;
        const est = dd.cerrado ? "Cerrado" : dd.pronto ? "Pronto" : horasDe(a.id, d).length === 0 ? "No atiende" : pasada(d) ? "Ya pasó" : off ? "Agotado" : l + (l === 1 ? " libre" : " libres");
        return `<button class="dia ${d === dsel ? "sel" : ""}" data-accion="dia" data-d="${d}" ${off ? "disabled" : ""} aria-selected="${d === dsel}">
        <div class="dsem">${DIAS_C[f.getDay()]}</div><div class="dnum">${f.getDate()}</div><div class="dmes">${MESES_C[f.getMonth()]}</div><div class="dlibres">${est}</div></button>`; }).join("")}
    </div>
  </div>
  <div class="panel-card" id="bloque-horas">
    ${dsel ? `<h3>Elige tu hora</h3><p class="nota-suave" style="margin:-8px 0 14px">${diaLargo(dsel)}</p>
    <div class="horas">${horasDe(a.id, dsel).map(h => { const r = ocupada(a.id, dsel, h), p = pasada(dsel, h);
      return `<button class="hora ${r || p ? "tachada" : S.hora === h ? "sel" : ""}" data-accion="hora" data-h="${h}" ${r || p ? "disabled" : ""}>${horaTxt(h)}${r ? "<small>Reservado</small>" : p ? "<small>No disponible</small>" : ""}</button>`; }).join("")}</div>
    <div class="leyenda"><span><i></i>Disponible</span><span><i class="s"></i>Tu elección</span><span><i class="r"></i>Reservado</span></div>`
    : `<h3>Agenda llena</h3><p class="nota-suave">Esta semana ${esc(a.nombre)} ya no tiene espacios. Elige otra especialista u otra semana.</p>`}
  </div>
  <button class="btn-principal" data-accion="continuar" ${S.dia && S.hora != null ? "" : "disabled"}>Continuar con mi cita ›</button>
  <p class="nota-suave">Los horarios están sujetos a confirmación por WhatsApp</p>
  ${pie()}</div>`;
}

function waLink() {
  const s = semana(S.semana), a = artista(S.artista);
  const msg = `¡Hola ${B.negocio.nombre}! ✨
Quiero agendar mi cita 🗓️

👤 Nombre: ${S.nombre.trim()}
💫 Servicio: ${S.servicio.trim() || "Por definir"}
💆‍♀️ Especialista: ${a.nombre}
📅 Semana: ${rangoTxt(s.desde, s.hasta)}
🗓️ Día: ${diaLargo(S.dia)}
⏰ Hora: ${horaTxt(S.hora)}

Entiendo que mi cita se confirma únicamente por WhatsApp, después de realizar el abono de ${pesos(B.negocio.abono)} 🤍
✅ Leí y acepto las políticas y autorizo el tratamiento de mis datos personales (Ley 1581 de 2012)`;
  return "https://wa.me/" + B.negocio.whatsapp + "?text=" + encodeURIComponent(msg);
}
const listo = () => S.nombre.trim().length >= 2 && S.acepto && S.datos;

function vConfirmar() {
  const s = semana(S.semana), a = artista(S.artista), N = B.negocio;
  return `<div class="vista">${topbar("agenda")}${pasos(3)}
  <div class="seccion-titulo" style="margin-top:14px"><h2 class="titulo script"><span class="chico">Tu cita está</span><span class="grande">casi lista</span></h2></div>
  <p class="seccion-sub">Revisa tu elección y envíanosla por WhatsApp</p>
  <div class="panel-card">
    <div class="resumen"><img src="${esc(a.foto)}" alt="${esc(a.nombre)}">
      <ul><li>Especialista: <b>${esc(a.nombre)}</b></li><li>Semana ${rangoTxt(s.desde, s.hasta)}</li><li><b>${diaLargo(S.dia)}</b></li><li><b>${horaTxt(S.hora)}</b></li></ul></div>
    <label class="campo"><span>Tu nombre *</span><input id="in-nombre" type="text" autocomplete="name" placeholder="¿Cómo te llamas?" value="${esc(S.nombre)}"></label>
    <label class="campo"><span>Servicio que deseas</span><input id="in-servicio" type="text" placeholder="Ej: valoración, limpieza facial, labios con ácido hialurónico…" value="${esc(S.servicio)}">
      ${N.catalogo ? `<div class="ayuda">¿Aún no sabes? <a href="${esc(N.catalogo)}" target="_blank" rel="noopener">Mira nuestro catálogo</a></div>` : ""}</label>
    <div class="aviso"><span class="script">Importante</span>
      <p>Tu cita se confirma <strong>únicamente por WhatsApp</strong>, una vez realices el <strong>abono de ${pesos(N.abono)}</strong> y nuestro equipo te la confirme. Elegir tu horario aquí <b>no</b> separa el cupo: la confirmación por WhatsApp es la única forma de asegurar tu cita.</p></div>
  </div>
  <div class="panel-card"><h3>Nuestras políticas</h3><div class="politicas">${politicasHTML()}</div>
    <label class="acepto"><input id="in-acepto" type="checkbox" ${S.acepto ? "checked" : ""}> Leí y acepto las políticas de ${esc(N.nombre)}</label>
    <label class="acepto"><input id="in-datos" type="checkbox" ${S.datos ? "checked" : ""}><span>Acepto el tratamiento de mis datos personales para fines de atención y comerciales. <button type="button" class="leer" data-accion="abrir-datos">Leer más</button></span></label>
    <p class="nota-datos">${esc(N.nombre)} no compartirá ni difundirá tus datos: solo los usa para atenderte, darte beneficios y hacerte seguimiento.</p></div>
  <a id="btn-wa" class="btn-principal btn-wa" href="${listo() ? waLink() : "#"}" target="_blank" rel="noopener" aria-disabled="${!listo()}" data-accion="enviar-wa">Enviar mi cita por WhatsApp</a>
  <p class="wa-num">Te escribiremos desde <b>${esc(waTxt())}</b></p>
  ${pie()}</div>`;
}

function vExito() {
  return `<div class="vista">${colgantes()}<div class="exito">
    <img class="logo" src="img/logo.webp" alt="${esc(B.negocio.nombre)}" style="margin-top:30px">
    <h2 class="script oro-txt" style="margin-top:22px">¡Te esperamos!</h2>
    <p>Abrimos WhatsApp con tu solicitud. Envía el mensaje y realiza tu <b>abono de ${pesos(B.negocio.abono)}</b>. Cuando nuestro equipo te confirme por WhatsApp, tu cita quedará lista.</p>
    <p style="font-size:14px">¿No se abrió WhatsApp? <a href="${waLink()}" target="_blank" rel="noopener" style="color:var(--cafe);font-weight:600">Toca aquí</a> o escríbenos al ${esc(waTxt())}.</p>
    <button class="btn-principal" data-accion="reiniciar" style="max-width:320px">Volver al inicio</button>
  </div>${pie()}</div>`;
}

const CORONA_MINI = `<svg class="corona" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 C21.2 13 27 18.8 38 20 C27 21.2 21.2 27 20 38 C18.8 27 13 21.2 2 20 C13 18.8 18.8 13 20 2 Z" fill="url(#go)"/></svg>`;
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A0625A"/><stop offset=".4" stop-color="#D99F92"/><stop offset=".55" stop-color="#F8DCD4"/><stop offset="1" stop-color="#A0625A"/></linearGradient></defs></svg>`;

/* ---------- render ---------- */
function render() {
  if (!B.listo.negocio || !B.listo.artistas || !B.listo.dias) return;
  if (!B.negocio) { $("#app").innerHTML = `<div class="cargando"><p>La agenda aún no está configurada.</p></div>`; return; }
  // si lo elegido desapareció (p. ej. la secretaria cambió la agenda), volver a un paso válido
  if (S.vista !== "inicio" && !semana(S.semana)) S.vista = "inicio";
  if (["agenda", "confirmar", "exito"].includes(S.vista) && !artista(S.artista)) S.vista = "artistas";
  efectos();
  const v = { inicio: vInicio, artistas: vArtistas, agenda: vAgenda, confirmar: vConfirmar, exito: vExito }[S.vista] || vInicio;
  $("#app").innerHTML = DEFS + v();
}
const ir = v => { S.vista = v; render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
const suave = () => { if (S.vista === "confirmar") return; const y = scrollY; render(); scrollTo(0, y); };
const actualizarWA = () => { const w = $("#btn-wa"); if (w) { w.setAttribute("aria-disabled", String(!listo())); w.href = listo() ? waLink() : "#"; } };

document.addEventListener("click", e => {
  const b = e.target.closest("[data-accion]"); if (!b) return;
  const ac = b.dataset.accion;
  if (ac === "ir") ir(b.dataset.vista);
  else if (ac === "semana") { Object.assign(S, { semana: b.dataset.id, artista: null, dia: null, hora: null }); ir("artistas"); }
  else if (ac === "artista") { Object.assign(S, { artista: b.dataset.id, dia: null, hora: null }); ir("agenda"); }
  else if (ac === "dia") { S.dia = b.dataset.d; S.hora = null; suave(); $("#bloque-horas")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (ac === "hora") { S.hora = Number(b.dataset.h); suave(); }
  else if (ac === "continuar") { if (S.dia && S.hora != null) ir("confirmar"); }
  else if (ac === "enviar-wa") {
    if (!listo()) { e.preventDefault(); toast(S.nombre.trim().length < 2 ? "Escribe tu nombre para continuar" : !S.acepto ? "Acepta las políticas para continuar" : "Acepta el tratamiento de datos para continuar"); return; }
    if (ocupada(S.artista, S.dia, S.hora)) { e.preventDefault(); toast("Ese horario acaba de reservarse. Elige otro"); S.hora = null; ir("agenda"); return; }
    b.href = waLink(); setTimeout(() => ir("exito"), 400);
  }
  else if (ac === "reiniciar") { Object.assign(S, { semana: null, artista: null, dia: null, hora: null, servicio: "", acepto: false, datos: false }); ir("inicio"); }
  else if (ac === "abrir-politicas") { $("#politicas-modal").innerHTML = politicasHTML(); $("#modal-politicas").classList.add("open"); }
  else if (ac === "cerrar-politicas") $("#modal-politicas").classList.remove("open");
  else if (ac === "abrir-datos") { e.preventDefault(); $("#datos-modal").innerHTML = textoLegal(B.negocio.datos); $("#modal-datos").classList.add("open"); }
  else if (ac === "cerrar-datos") $("#modal-datos").classList.remove("open");
  else if (ac === "aceptar-datos") { S.datos = true; const c = $("#in-datos"); if (c) c.checked = true; actualizarWA(); $("#modal-datos").classList.remove("open"); }
});
$("#modal-politicas").addEventListener("click", e => { if (e.target.id === "modal-politicas") e.currentTarget.classList.remove("open"); });
$("#modal-datos").addEventListener("click", e => { if (e.target.id === "modal-datos") e.currentTarget.classList.remove("open"); });
document.addEventListener("input", e => {
  if (e.target.id === "in-nombre") { S.nombre = e.target.value; actualizarWA(); }
  if (e.target.id === "in-servicio") { S.servicio = e.target.value; actualizarWA(); }
});
document.addEventListener("change", e => {
  if (e.target.id === "in-acepto") { S.acepto = e.target.checked; actualizarWA(); }
  if (e.target.id === "in-datos") { S.datos = e.target.checked; actualizarWA(); }
});

/* ---------- arranque ---------- */
(async () => {
  try { await D.iniciar(); }
  catch (err) { console.error(err); $("#app").innerHTML = `<div class="cargando"><p>No pudimos cargar la agenda. Revisa tu conexión e intenta de nuevo.</p></div>`; return; }
  const fallo = err => { console.error(err); toast("No pudimos actualizar la agenda"); };
  D.escuchar("config/negocio", d => { B.negocio = d; B.listo.negocio = true; render(); }, null, fallo);
  D.escuchar("artistas", l => { B.artistas = l; B.listo.artistas = true; render(); }, null, fallo);
  D.escuchar("dias", l => { B.dias = l; B.listo.dias = true; render(); }, null, fallo);
  D.escuchar("ocupados", l => {
    B.ocupados = new Set(l.map(o => o.id));
    if (S.vista === "agenda" && S.hora != null && ocupada(S.artista, S.dia, S.hora)) { S.hora = null; toast("Ese horario acaba de reservarse"); }
    suave();
  }, { campo: "fecha", op: ">=", valor: hoyISO() }, fallo);
})();
