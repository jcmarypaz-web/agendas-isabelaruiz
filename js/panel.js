/* Panel de la secretaria */
import * as D from "./datos.js";
import { $, esc, iso, fecha, hoyISO, sumarDias, lunesDe, horaTxt, diaLargo, diaCorto, rangoTxt, pasada, semanasDe, slotId, pesos, toast,
         DIAS_C, MESES, MESES_C } from "./util.js";

/* ---------------- estado ---------------- */
const B = { negocio: null, artistas: [], dias: [], ocupados: [], citas: [], clientas: [] };
const P = {
  tab: "agenda", usuario: null,
  ag: { semana: null, artista: null, vista: "dia", dia: null },
  cl: { sel: null, q: "", filtro: "todas" },
  cal: { mes: hoyISO().slice(0, 7), ini: null, fin: null },
  ed: { horas: {}, dsem: [1, 2, 3, 4, 5, 6], estado: "publicado" },
  modal: null, pendiente: false, login: "entrar"
};
let desuscribir = [];

/* ---------------- derivados ---------------- */
const artistasOrden = () => B.artistas.slice().sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
const artistasAgenda = () => artistasOrden().filter(a => a.estado !== "oculta");
const artista = id => B.artistas.find(a => a.id === id);
const diaDoc = id => B.dias.find(d => d.id === id);
/* horas de una artista en un día + las que tengan cita aunque ya no estén en el horario (para no "perder" citas) */
const horasDe = (aid, d) => { const x = diaDoc(d); const base = x && !x.cerrado ? ((x.horas || {})[aid] || []) : [];
  const extra = B.ocupados.filter(o => o.artista === aid && o.fecha === d).map(o => o.hora);
  return [...new Set([...base, ...extra])].sort((a, b) => a - b); };
const citaDe = id => B.citas.find(c => c.id === id);
const ocupado = id => B.ocupados.some(o => o.id === id);
const clienta = id => B.clientas.find(c => c.id === id);
const citasDeClienta = id => B.citas.filter(c => c.clienteId === id).sort((a, b) => (b.fecha + pad(b.hora)).localeCompare(a.fecha + pad(a.hora)));
const pad = h => String(h ?? 0).padStart(4, "0");
const iniciales = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
const telLimpio = t => String(t || "").replace(/\D/g, "");
const waDe = t => { let n = telLimpio(t); if (n.length === 10) n = "57" + n; return n ? "https://wa.me/" + n : null; };
const procedimientos = () => [...new Set(B.citas.map(c => (c.procedimiento || "").trim()).filter(Boolean))].sort();
const TIEMPOS = (() => { const o = []; for (let m = 6 * 60; m <= 20 * 60; m += 30) o.push(m); return o; })();

/* ---------------- render general ---------------- */
function render(forzar) {
  if (!forzar && document.querySelector("[data-sucio]")) { P.pendiente = true; return; }
  P.pendiente = false;
  const app = $("#app");
  if (!P.usuario) { app.innerHTML = vLogin(); return; }
  const y = scrollY;
  app.innerHTML = cabecera() + `<div id="contenido">${({ agenda: vAgenda, clientas: vClientas, horarios: vHorarios, artistas: vArtistas, ajustes: vAjustes })[P.tab]()}</div>`;
  scrollTo(0, y);
}
function cabecera() {
  const N = B.negocio || {};
  const tabs = [["agenda", "Agenda"], ["clientas", "Clientas"], ["horarios", "Horarios"], ["artistas", "Artistas"], ["ajustes", "Portada y ajustes"]];
  return `<header class="p-head"><div class="marca"><img src="img/logo.webp" alt=""><h1>Panel de agenda</h1></div>
    <div class="usuario">${esc(P.usuario.email)}<button class="btn btn-blanco btn-sm" data-a="clave-abrir">Cambiar contraseña</button><button class="btn btn-blanco btn-sm" data-a="salir">Salir</button></div></header>
    ${D.modo === "demo" ? `<div class="demo-banner"><span><b>Modo demostración:</b> los cambios se guardan solo en este navegador. Abre la página de clientas en otra pestaña para ver cómo se actualiza.</span><span class="fila"><a class="btn btn-blanco btn-sm" href="index.html" target="_blank" rel="noopener">Ver página de clientas</a><button class="btn btn-peligro btn-sm" data-a="demo-reiniciar">Reiniciar demo</button></span></div>` : ""}
    ${!N.nombre ? "" : ""}
    <nav class="tabs">${tabs.map(([k, t]) => `<button class="tab ${P.tab === k ? "on" : ""}" data-a="tab" data-k="${k}">${t}</button>`).join("")}</nav>`;
}

/* ---------------- LOGIN ---------------- */
function vLogin() {
  return `<div class="login"><img class="logo" src="img/logo.webp" alt="">
  <div class="tarjeta"><h2>Panel de agenda</h2>
  ${D.modo === "demo" ? `<p class="ayuda-txt">Estás en <b>modo demostración</b>. Entra sin contraseña para probar el panel.</p><button class="btn btn-rosa" style="width:100%" data-a="entrar-demo">Entrar a la demo</button>`
  : P.login === "crear" ? `<form id="f-enlace"><p class="ayuda-txt"><b>¿Primera vez o se te olvidó?</b> Escribe tu correo y te enviaremos un enlace para que <b>tú misma crees tu contraseña</b>. Nadie más la conocerá.</p>
     <label class="campo-p"><span>Correo</span><input class="inp" type="email" name="correo" autocomplete="username" required></label>
     <button class="btn btn-rosa" style="width:100%" type="submit">Enviarme el enlace</button><div id="enlace-msg"></div>
     <button type="button" class="link-clave" data-a="login-modo" data-v="entrar">‹ Volver a entrar</button></form>`
  : `<form id="f-login"><label class="campo-p"><span>Correo</span><input class="inp" type="email" name="correo" autocomplete="username" required></label>
     <label class="campo-p"><span>Contraseña</span><input class="inp" type="password" name="clave" autocomplete="current-password" required></label>
     <button class="btn btn-rosa" style="width:100%" type="submit">Entrar</button><p class="ayuda-txt" id="login-error" style="color:#B0453A;margin-top:10px"></p>
     <button type="button" class="link-clave" data-a="login-modo" data-v="crear">Crear mi contraseña / Olvidé mi contraseña</button></form>`}
  </div></div>`;
}

/* ================= AGENDA (reservas) ================= */
function semanasPanel() { return semanasDe(B.dias.filter(d => !d.pronto), sumarDias(hoyISO(), -21)); }
function vAgenda() {
  const ss = semanasPanel();
  if (!ss.length) return `<div class="tarjeta"><h2>Agenda</h2><p class="vacio">Todavía no hay días habilitados. Ve a <b>Horarios</b> para abrir fechas.</p></div>`;
  if (!P.ag.semana || !ss.some(s => s.id === P.ag.semana)) P.ag.semana = (ss.find(s => s.hasta >= hoyISO()) || ss[ss.length - 1]).id;
  const arts = artistasAgenda();
  if (!P.ag.artista || !arts.some(a => a.id === P.ag.artista)) P.ag.artista = arts[0]?.id;
  const s = ss.find(x => x.id === P.ag.semana), a = artista(P.ag.artista);
  const cab = `<div class="tarjeta"><h2>Agenda</h2>
  <div class="fila-sel" style="margin-bottom:6px"><button class="sel-btn ${P.ag.vista === "dia" ? "on" : ""}" data-a="ag-vista" data-v="dia">Por día (todas las artistas)</button><button class="sel-btn ${P.ag.vista === "semana" ? "on" : ""}" data-a="ag-vista" data-v="semana">Por artista (semana completa)</button></div>
  <div class="lbl">Semana</div><div class="fila-sel">${ss.map(x => `<button class="sel-btn ${x.id === s.id ? "on" : ""}" data-a="ag-semana" data-id="${x.id}">${rangoTxt(x.desde, x.hasta)}</button>`).join("")}</div>`;
  if (P.ag.vista === "dia") return cab + vAgendaDia(s, arts);
  if (!a) return `<div class="tarjeta"><p class="vacio">Agrega artistas en la pestaña <b>Artistas</b>.</p></div>`;
  const filas = [...new Set(s.dias.flatMap(d => horasDe(a.id, d.id)))].sort((x, y) => x - y);
  const citasSem = B.citas.filter(c => s.dias.some(d => d.id === c.fecha) && c.hora != null && ocupado(c.id)).sort((x, y) => (x.fecha + pad(x.hora)).localeCompare(y.fecha + pad(y.hora)));
  return cab + `<p class="ayuda-txt" style="margin-top:12px">Toca un horario <b>libre</b> para reservarlo o bloquearlo. Toca uno <b>reservado</b> para ver, editar o cancelar la cita.</p>
  <div class="lbl">Artista</div><div class="fila-sel">${arts.map(x => { const n = citasSem.filter(c => c.artista === x.id).length; return `<button class="sel-btn ${x.id === a.id ? "on" : ""}" data-a="ag-artista" data-id="${esc(x.id)}"><img src="${esc(x.foto)}" alt="">${esc(x.nombre)} (${n})</button>`; }).join("")}</div></div>
  ${filas.length ? `<div class="tabla-wrap"><table class="grilla"><thead><tr><th></th>${s.dias.map(d => { const f = fecha(d.id); return `<th>${DIAS_C[f.getDay()]}<span class="n">${diaCorto(d.id)}</span>${d.cerrado ? "<small>Cerrado</small>" : ""}</th>`; }).join("")}</tr></thead>
  <tbody>${filas.map(h => `<tr><td class="h">${horaTxt(h)}</td>${s.dias.map(d => {
    if (!horasDe(a.id, d.id).includes(h)) return `<td><span class="celda vacia">—</span></td>`;
    const id = slotId(a.id, d.id, h), oc = ocupado(id), c = citaDe(id), pas = pasada(d.id, h);
    const cls = oc ? (c && c.clienteNombre ? "res" : "bloq") : "";
    return `<td><button class="celda ${cls} ${pas ? "pasada" : ""}" data-a="celda" data-d="${d.id}" data-h="${h}">${oc ? (c && c.clienteNombre ? `Reservado<span class="quien">${esc(c.clienteNombre)}</span>` : "Bloqueado") : "Libre"}</button></td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`
  : `<div class="tarjeta"><p class="vacio">${esc(a.nombre)} no tiene horarios esta semana. Puedes asignarle horas en <b>Horarios</b>.</p></div>`}
  <div class="tarjeta" style="margin-top:16px"><h3>Citas de la semana (todas las artistas)</h3>
  <div class="res-list">${citasSem.length ? citasSem.map(c => `<div class="res-item"><span><b>${esc(artista(c.artista)?.nombre || c.artista)}</b> · ${diaLargo(c.fecha)} · ${horaTxt(c.hora)}</span><span>${c.clienteNombre ? `${esc(c.clienteNombre)}${c.procedimiento ? " · " + esc(c.procedimiento) : ""}` : "<i>Bloqueado</i>"}</span></div>`).join("") : `<p class="vacio">Aún no hay citas esta semana.</p>`}</div></div>`;
}

/* vista: un día con todas las artistas */
function vAgendaDia(s, arts) {
  if (!P.ag.dia || !s.dias.some(d => d.id === P.ag.dia)) P.ag.dia = (s.dias.find(d => d.id >= hoyISO()) || s.dias[0]).id;
  const d = P.ag.dia, dd = diaDoc(d);
  const conHoras = arts.filter(a => horasDe(a.id, d).length);
  const filas = [...new Set(conHoras.flatMap(a => horasDe(a.id, d)))].sort((x, y) => x - y);
  let agend = [], bloq = 0, disp = 0; const dispPor = {};
  for (const a of conHoras) for (const h of horasDe(a.id, d)) {
    const id = slotId(a.id, d, h);
    if (ocupado(id)) { const c = citaDe(id); if (c && c.clienteNombre) agend.push(c); else bloq++; }
    else if (!pasada(d, h)) { disp++; (dispPor[a.id] = dispPor[a.id] || []).push(h); }
  }
  agend.sort((x, y) => x.hora - y.hora);
  return `<div class="lbl">Día</div><div class="fila-sel">${s.dias.map(x => { const f = fecha(x.id); return `<button class="sel-btn ${x.id === d ? "on" : ""}" data-a="ag-dia" data-d="${x.id}">${DIAS_C[f.getDay()]} ${f.getDate()}</button>`; }).join("")}</div></div>
  <div class="tarjeta"><div class="fila" style="justify-content:space-between"><h3 style="margin:0">${diaLargo(d)}${dd && dd.cerrado ? " · Cerrado" : ""}</h3><button class="btn btn-oro btn-sm" data-a="ag-editar-dia" data-d="${d}">Agregar o quitar espacios de este día</button></div>
  <div class="stats"><div class="stat"><b>${agend.length}</b><span>Citas agendadas</span></div><div class="stat"><b>${disp}</b><span>Espacios disponibles</span></div><div class="stat"><b>${bloq}</b><span>Bloqueados</span></div></div>
  ${filas.length ? `<div class="tabla-wrap" style="box-shadow:none;padding:0"><table class="grilla"><thead><tr><th></th>${conHoras.map(a => `<th><img src="${esc(a.foto)}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:center 25%;display:block;margin:0 auto 4px">${esc(a.nombre)}</th>`).join("")}</tr></thead>
  <tbody>${filas.map(h => `<tr><td class="h">${horaTxt(h)}</td>${conHoras.map(a => {
    if (!horasDe(a.id, d).includes(h)) return `<td><span class="celda vacia">—</span></td>`;
    const id = slotId(a.id, d, h), oc = ocupado(id), c = citaDe(id), pas = pasada(d, h);
    return `<td><button class="celda ${oc ? (c && c.clienteNombre ? "res" : "bloq") : ""} ${pas ? "pasada" : ""}" data-a="celda" data-art="${esc(a.id)}" data-d="${d}" data-h="${h}">${oc ? (c && c.clienteNombre ? `Agendada<span class="quien">${esc(c.clienteNombre)}</span>` : "Bloqueado") : pas ? "Pasó" : "Disponible"}</button></td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>` : `<p class="vacio">No hay espacios este día. Usa el botón dorado para agregarlos.</p>`}</div>
  <div class="dos" style="align-items:start">
  <div class="tarjeta"><h3>Citas agendadas</h3><div class="res-list">${agend.length ? agend.map(c => `<button class="res-item" style="width:100%;text-align:left" data-a="celda" data-art="${esc(c.artista)}" data-d="${d}" data-h="${c.hora}"><span><b>${horaTxt(c.hora)}</b> · ${esc(artista(c.artista)?.nombre || "")}</span><span>${esc(c.clienteNombre)}${c.procedimiento ? " · " + esc(c.procedimiento) : ""}</span></button>`).join("") : `<p class="vacio">Aún no hay citas este día.</p>`}</div></div>
  <div class="tarjeta"><h3>Espacios disponibles</h3>${Object.keys(dispPor).length ? conHoras.filter(a => dispPor[a.id]).map(a => `<div style="margin-bottom:10px"><b style="color:var(--marron)">${esc(a.nombre)}</b> <span class="badge">${dispPor[a.id].length}</span><div class="chips" style="margin-top:6px">${dispPor[a.id].map(h => `<button class="chip-h" data-a="celda" data-art="${esc(a.id)}" data-d="${d}" data-h="${h}">${horaTxt(h)}</button>`).join("")}</div></div>`).join("") : `<p class="vacio">No quedan espacios disponibles.</p>`}</div></div>`;
}

/* modal: reservar horario libre */
function mReservar(art, d, h) {
  P.modal = { tipo: "reservar", art, d, h, modo: "clienta", clienteId: null, q: "", nueva: false };
  pintarModal();
}
function mReservarHTML(m) {
  const a = artista(m.art);
  const q = m.q.trim().toLowerCase();
  const sug = q ? B.clientas.filter(c => (c.nombre || "").toLowerCase().includes(q) || telLimpio(c.telefono).includes(telLimpio(q) || "@@")).slice(0, 8) : [];
  const sel = m.clienteId && clienta(m.clienteId);
  return `<h3>Reservar horario</h3><p class="ayuda-txt"><b>${esc(a.nombre)}</b> · ${diaLargo(m.d)} · ${horaTxt(m.h)}</p>
  <div class="fila-sel" style="margin-bottom:12px"><button class="sel-btn ${m.modo === "clienta" ? "on" : ""}" data-a="m-modo" data-v="clienta">Para una clienta</button><button class="sel-btn ${m.modo === "bloqueo" ? "on" : ""}" data-a="m-modo" data-v="bloqueo">Solo bloquear</button></div>
  ${m.modo === "clienta" ? (sel ? `<div class="res-item"><span><b>${esc(sel.nombre)}</b>${sel.telefono ? " · " + esc(sel.telefono) : ""}</span><button class="btn btn-blanco btn-sm" data-a="m-quitar-cl">Cambiar</button></div>`
    : m.nueva ? `<div class="dos"><label class="campo-p"><span>Nombre de la clienta *</span><input class="inp" id="m-nombre" value="${esc(m.q)}"></label><label class="campo-p"><span>Celular</span><input class="inp" id="m-tel" inputmode="tel" placeholder="300 000 0000"></label></div>
      <label class="campo-p"><span>Cumpleaños</span><input class="inp" id="m-cumple" type="date"></label><button class="btn btn-blanco btn-sm" data-a="m-buscar">Buscar una existente</button>`
    : `<label class="campo-p"><span>Buscar clienta (nombre o celular)</span><input class="inp" id="m-q" value="${esc(m.q)}" placeholder="Escribe para buscar…" autocomplete="off"></label>
      <div class="sugerencias">${sug.map(c => `<button data-a="m-elegir" data-id="${c.id}"><b>${esc(c.nombre)}</b>${c.telefono ? " · " + esc(c.telefono) : ""}</button>`).join("")}</div>
      <button class="btn btn-blanco btn-sm" style="margin-top:8px" data-a="m-nueva">+ Nueva clienta${m.q ? ": " + esc(m.q) : ""}</button>`) : ""}
  ${m.modo === "clienta" ? `<label class="campo-p" style="margin-top:12px"><span>Procedimiento</span><input class="inp" id="m-proc" list="lista-proc" placeholder="Ej: pestañas pelo a pelo"><datalist id="lista-proc">${procedimientos().map(p => `<option value="${esc(p)}">`).join("")}</datalist></label>` : ""}
  <label class="campo-p"><span>Nota (opcional)</span><input class="inp" id="m-nota" placeholder="${m.modo === "bloqueo" ? "Motivo del bloqueo" : "Abono recibido, detalles…"}"></label>
  <div class="acciones"><button class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-rosa" data-a="m-guardar-reserva">Guardar</button></div>`;
}
async function guardarReserva() {
  const m = P.modal, id = slotId(m.art, m.d, m.h);
  const nota = ($("#m-nota")?.value || "").trim();
  const ops = [];
  let clienteId = null, clienteNombre = "";
  if (m.modo === "clienta") {
    if (m.clienteId) { clienteId = m.clienteId; clienteNombre = clienta(m.clienteId)?.nombre || ""; }
    else if (m.nueva) {
      const nombre = ($("#m-nombre")?.value || "").trim();
      if (nombre.length < 2) return toast("Escribe el nombre de la clienta");
      clienteId = "c" + D.uid(); clienteNombre = nombre;
      ops.push({ op: "set", ruta: "clientas/" + clienteId, datos: { nombre, telefono: ($("#m-tel")?.value || "").trim(), cumple: $("#m-cumple")?.value || "", notas: "", creado: Date.now() } });
    } else return toast("Elige una clienta o crea una nueva");
  }
  ops.push({ op: "set", ruta: "ocupados/" + id, datos: { artista: m.art, fecha: m.d, hora: m.h } });
  ops.push({ op: "set", ruta: "citas/" + id, datos: { artista: m.art, fecha: m.d, hora: m.h, clienteId, clienteNombre, procedimiento: ($("#m-proc")?.value || "").trim(), nota, creado: Date.now() } });
  await ejecutar(ops, m.modo === "clienta" ? "Cita reservada" : "Horario bloqueado");
  cerrarModal();
}

/* modal: ver cita */
function mCitaHTML(m) {
  const c = citaDe(m.id) || { artista: m.art, fecha: m.d, hora: m.h };
  const a = artista(c.artista), cl = c.clienteId && clienta(c.clienteId);
  return `<h3>${c.clienteNombre ? "Cita" : "Horario bloqueado"}</h3><p class="ayuda-txt"><b>${esc(a?.nombre || "")}</b> · ${diaLargo(c.fecha)} · ${horaTxt(c.hora)}</p>
  ${c.clienteNombre ? `<div class="res-item"><span><b>${esc(c.clienteNombre)}</b>${cl && cl.telefono ? " · " + esc(cl.telefono) : ""}</span>${cl ? `<button class="btn btn-blanco btn-sm" data-a="ir-clienta" data-id="${cl.id}">Ver clienta</button>` : ""}</div>
  <label class="campo-p" style="margin-top:12px"><span>Procedimiento</span><input class="inp" id="m-proc" list="lista-proc" value="${esc(c.procedimiento || "")}"><datalist id="lista-proc">${procedimientos().map(p => `<option value="${esc(p)}">`).join("")}</datalist></label>` : ""}
  <label class="campo-p"><span>Nota</span><input class="inp" id="m-nota" value="${esc(c.nota || "")}"></label>
  <div class="acciones"><button class="btn btn-peligro" data-a="m-liberar">${c.clienteNombre ? "Cancelar cita y liberar horario" : "Liberar horario"}</button><button class="btn btn-rosa" data-a="m-guardar-cita">Guardar cambios</button></div>`;
}

/* ================= CLIENTAS (CRM) ================= */
function vClientas() {
  const q = P.cl.q.trim().toLowerCase(), mes = new Date().getMonth() + 1;
  let lista = B.clientas.slice().sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  if (q) lista = lista.filter(c => (c.nombre || "").toLowerCase().includes(q) || telLimpio(c.telefono).includes(telLimpio(q) || "@@"));
  if (P.cl.filtro === "cumple") lista = lista.filter(c => c.cumple && Number(c.cumple.slice(5, 7)) === mes);
  const sel = P.cl.sel && clienta(P.cl.sel);
  return `<div class="crm">
  <div class="tarjeta"><h2>Clientas</h2>
    <input class="inp" id="cl-q" placeholder="Buscar por nombre o celular" value="${esc(P.cl.q)}" autocomplete="off">
    <div class="fila" style="margin:10px 0"><button class="sel-btn ${P.cl.filtro === "todas" ? "on" : ""}" data-a="cl-filtro" data-v="todas">Todas (${B.clientas.length})</button><button class="sel-btn ${P.cl.filtro === "cumple" ? "on" : ""}" data-a="cl-filtro" data-v="cumple">Cumpleañeras de ${MESES[mes - 1]}</button></div>
    <button class="btn btn-rosa" style="width:100%;margin-bottom:12px" data-a="cl-nueva">+ Nueva clienta</button>
    <div class="lista-cl">${lista.length ? lista.map(c => { const n = citasDeClienta(c.id).length; return `<button class="cl-item ${sel && sel.id === c.id ? "on" : ""}" data-a="cl-sel" data-id="${c.id}"><span class="avatar">${esc(iniciales(c.nombre))}</span><span><span class="nom">${esc(c.nombre)}</span><br><span class="sub">${c.telefono ? esc(c.telefono) + " · " : ""}${n} ${n === 1 ? "cita" : "citas"}</span></span></button>`; }).join("") : `<p class="vacio">${q ? "No hay clientas con ese nombre." : "Aún no hay clientas registradas."}</p>`}</div>
  </div>
  <div>${sel ? vFichaClienta(sel) : `<div class="tarjeta"><p class="vacio">Elige una clienta para ver su historial, o crea una nueva.</p></div>`}</div></div>`;
}
function vFichaClienta(c) {
  const hist = citasDeClienta(c.id), hoy = hoyISO();
  const pasadas = hist.filter(x => x.fecha < hoy || (x.fecha === hoy && pasada(x.fecha, x.hora))), futuras = hist.filter(x => !pasadas.includes(x));
  const ult = pasadas[0], mes = new Date().getMonth() + 1, cumpleMes = c.cumple && Number(c.cumple.slice(5, 7)) === mes;
  const wa = waDe(c.telefono);
  const favorita = (() => { const k = {}; pasadas.forEach(x => k[x.artista] = (k[x.artista] || 0) + 1); const t = Object.entries(k).sort((a, b) => b[1] - a[1])[0]; return t ? artista(t[0])?.nombre : null; })();
  return `<div class="tarjeta">
  <div class="fila" style="justify-content:space-between"><div class="fila"><span class="avatar" style="width:56px;height:56px;font-size:26px">${esc(iniciales(c.nombre))}</span><div><h2 style="margin:0">${esc(c.nombre)}</h2>${cumpleMes ? `<span class="badge oro">Cumpleaños este mes</span>` : ""}</div></div>
  <div class="fila">${wa ? `<a class="btn btn-blanco btn-sm" href="${wa}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ""}</div></div>
  <div class="stats"><div class="stat"><b>${pasadas.length}</b><span>Visitas</span></div><div class="stat"><b style="font-size:18px;line-height:1.6">${ult ? diaCorto(ult.fecha) : "—"}</b><span>Última visita</span></div><div class="stat"><b style="font-size:18px;line-height:1.6">${favorita ? esc(favorita) : "—"}</b><span>Su artista</span></div></div>
  <form id="f-clienta" data-id="${c.id}">
    <div class="dos"><label class="campo-p"><span>Nombre *</span><input class="inp" name="nombre" value="${esc(c.nombre)}" required></label><label class="campo-p"><span>Celular</span><input class="inp" name="telefono" inputmode="tel" value="${esc(c.telefono || "")}"></label></div>
    <div class="dos"><label class="campo-p"><span>Cumpleaños</span><input class="inp" type="date" name="cumple" value="${esc(c.cumple || "")}"></label><label class="campo-p"><span>Correo</span><input class="inp" type="email" name="correo" value="${esc(c.correo || "")}"></label></div>
    <label class="campo-p"><span>Notas de seguimiento</span><textarea name="notas" placeholder="Alergias, preferencias, curvatura, tipo de pestaña…">${esc(c.notas || "")}</textarea></label>
    <div class="acciones" style="justify-content:space-between"><button type="button" class="btn btn-peligro btn-sm" data-a="cl-borrar" data-id="${c.id}">Eliminar clienta</button><button class="btn btn-rosa" type="submit">Guardar datos</button></div>
  </form></div>
  <div class="tarjeta"><div class="fila" style="justify-content:space-between"><h3>Historial de procedimientos</h3><button class="btn btn-blanco btn-sm" data-a="cl-visita" data-id="${c.id}">+ Registrar visita</button></div>
  <div class="hist">${hist.length ? hist.map(x => { const fut = futuras.includes(x); return `<div class="hist-item ${fut ? "futura" : ""}"><div class="fch">${diaCorto(x.fecha)}<small>${fecha(x.fecha).getFullYear()}${x.hora != null ? " · " + horaTxt(x.hora) : ""}</small></div>
    <div><b style="color:var(--marron)">${esc(x.procedimiento || "Procedimiento sin especificar")}</b><br><span style="font-size:13px">con ${esc(artista(x.artista)?.nombre || "—")}${x.nota ? " · " + esc(x.nota) : ""}</span></div>
    <div>${fut ? `<span class="badge">Próxima cita</span>` : ""} <button class="btn btn-blanco btn-sm" data-a="cl-editar-visita" data-id="${x.id}">Editar</button></div></div>`; }).join("") : `<p class="vacio">Todavía no tiene visitas registradas. Se agregan solas cuando reservas un horario para ella en la Agenda, o puedes registrarlas a mano.</p>`}</div></div>`;
}
function mNuevaClientaHTML() {
  return `<h3>Nueva clienta</h3><form id="f-nueva-cl">
  <label class="campo-p"><span>Nombre *</span><input class="inp" name="nombre" required></label>
  <div class="dos"><label class="campo-p"><span>Celular</span><input class="inp" name="telefono" inputmode="tel"></label><label class="campo-p"><span>Cumpleaños</span><input class="inp" type="date" name="cumple"></label></div>
  <label class="campo-p"><span>Correo</span><input class="inp" type="email" name="correo"></label>
  <label class="campo-p"><span>Notas</span><textarea name="notas"></textarea></label>
  <div class="acciones"><button type="button" class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-rosa" type="submit">Crear clienta</button></div></form>`;
}
function mVisitaHTML(m) {
  const v = m.id ? citaDe(m.id) : null;
  return `<h3>${v ? "Editar visita" : "Registrar visita"}</h3><p class="ayuda-txt">${esc(clienta(m.clienteId)?.nombre || "")}</p><form id="f-visita">
  <div class="dos"><label class="campo-p"><span>Fecha *</span><input class="inp" type="date" name="fecha" value="${esc(v?.fecha || hoyISO())}" required ${v && ocupado(v.id) ? "disabled" : ""}></label>
  <label class="campo-p"><span>Artista</span><select name="artista">${artistasOrden().map(a => `<option value="${esc(a.id)}" ${v?.artista === a.id ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select></label></div>
  <label class="campo-p"><span>Procedimiento *</span><input class="inp" name="procedimiento" list="lista-proc" value="${esc(v?.procedimiento || "")}" required><datalist id="lista-proc">${procedimientos().map(p => `<option value="${esc(p)}">`).join("")}</datalist></label>
  <label class="campo-p"><span>Nota</span><input class="inp" name="nota" value="${esc(v?.nota || "")}"></label>
  <div class="acciones">${v && !ocupado(v.id) ? `<button type="button" class="btn btn-peligro" data-a="v-borrar">Eliminar visita</button>` : ""}<button type="button" class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-rosa" type="submit">Guardar</button></div></form>`;
}

/* ================= HORARIOS ================= */
function vHorarios() {
  const [y, mo] = P.cal.mes.split("-").map(Number);
  const primero = new Date(y, mo - 1, 1), off = (primero.getDay() + 6) % 7;
  const celdas = []; for (let i = 0; i < 42; i++) celdas.push(iso(new Date(y, mo - 1, 1 - off + i)));
  const { ini, fin } = P.cal, hoy = hoyISO();
  const enRango = d => ini && (fin ? d >= ini && d <= fin : d === ini);
  const nRes = d => B.ocupados.filter(o => o.fecha === d).length;
  const sel = ini ? (fin ? `Del <b>${diaLargo(ini)}</b> al <b>${diaLargo(fin)}</b>` : `<b>${diaLargo(ini)}</b>`) : "";
  const diasSel = diasSeleccionados();
  const arts = artistasAgenda();
  const conHoras = B.dias.filter(d => Object.values(d.horas || {}).some(h => h.length)).map(d => d.id).sort().reverse();
  return `<div class="horarios">
  <div class="tarjeta"><h2>Calendario</h2><p class="ayuda-txt">Toca un día para verlo o editarlo. Para habilitar varios días, toca el <b>primer día</b> y luego el <b>último</b>.</p>
    <div class="cal-head"><button class="btn btn-blanco btn-sm" data-a="cal-mes" data-v="-1">‹</button><span class="mes">${MESES[mo - 1]} ${y}</span><button class="btn btn-blanco btn-sm" data-a="cal-mes" data-v="1">›</button></div>
    <div class="cal">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => `<div class="dsem">${d}</div>`).join("")}
    ${celdas.map(d => { const x = diaDoc(d), f = fecha(d), n = x && !x.cerrado && !x.pronto ? Object.values(x.horas || {}).filter(h => h.length).length : 0, r = nRes(d);
      const cls = [f.getMonth() !== mo - 1 ? "otro" : "", d < hoy ? "pasado" : "", d === hoy ? "hoy" : "", x ? (x.cerrado ? "cerrado" : x.pronto ? "pronto" : n ? "activo" : "") : "", enRango(d) ? "rango" : ""].join(" ");
      return `<button class="cdia ${cls}" data-a="cal-dia" data-d="${d}">${f.getDate()}<small>${x ? (x.cerrado ? "Cerrado" : x.pronto ? "Pronto" : n ? n + " art." + (r ? " · " + r + "r" : "") : "") : ""}</small></button>`; }).join("")}</div>
    <div class="leyenda-cal"><span><i style="background:#F8E8E4;border-color:#DDB0A6"></i>Habilitado</span><span><i style="background:#FBF3DC;border-color:#E3CF9E"></i>Próximamente</span><span><i style="background:#F2EBEA"></i>Cerrado</span><span><i style="background:var(--cafe);border-color:var(--cafe)"></i>Seleccionado</span></div>
  </div>
  <div class="tarjeta">${!ini ? `<h2>Habilitar días</h2><p class="vacio">Elige uno o varios días en el calendario para habilitarlos, cambiar sus horas o cerrarlos.</p>` : `
    <h2>${fin ? "Habilitar días" : "Editar día"}</h2><p class="ayuda-txt">${sel}${fin ? ` · se aplicará a <b>${diasSel.length}</b> ${diasSel.length === 1 ? "día" : "días"}` : ""}</p>
    ${fin ? `<div class="lbl">Días de la semana que se atienden</div><div class="dsemana">${[1, 2, 3, 4, 5, 6, 0].map(k => `<label><input type="checkbox" data-a="ed-dsem" data-k="${k}" ${P.ed.dsem.includes(k) ? "checked" : ""}>${DIAS_C[k]}</label>`).join("")}</div>` : ""}
    <div class="lbl">Cómo se muestra a las clientas</div>
    <div class="fila-sel"><button class="sel-btn ${P.ed.estado === "publicado" ? "on" : ""}" data-a="ed-estado" data-v="publicado">Publicado (se puede agendar)</button><button class="sel-btn ${P.ed.estado === "pronto" ? "on" : ""}" data-a="ed-estado" data-v="pronto">Próximamente</button></div>
    <div class="lbl">Horas de cada artista</div>
    <div class="fila" style="margin-bottom:10px"><select id="copiar-de" style="max-width:260px"><option value="">Copiar horario de otro día…</option>${conHoras.map(d => `<option value="${d}">${diaLargo(d)} ${fecha(d).getFullYear()}</option>`).join("")}</select><button class="btn btn-blanco btn-sm" data-a="ed-copiar-dia">Copiar</button><button class="btn btn-blanco btn-sm" data-a="ed-limpiar">Limpiar todo</button></div>
    ${arts.map(a => { const hs = P.ed.horas[a.id] || []; return `<div class="ed-art"><div class="cab"><span class="n"><img src="${esc(a.foto)}" alt="">${esc(a.nombre)} <span class="badge">${hs.length} ${hs.length === 1 ? "cita" : "citas"}</span></span>
      <span class="fila"><input type="time" class="inp" style="width:120px;padding:6px 10px;font-size:13px" id="hx-${esc(a.id)}" step="300"><button class="btn btn-blanco btn-sm" data-a="ed-hora-extra" data-id="${esc(a.id)}">+ Agregar hora</button><button class="btn btn-blanco btn-sm" data-a="ed-copiar-todas" data-id="${esc(a.id)}">Copiar a todas</button><button class="btn btn-blanco btn-sm" data-a="ed-vaciar" data-id="${esc(a.id)}">No atiende</button></span></div>
      <div class="chips">${[...new Set([...TIEMPOS, ...hs])].sort((x, y) => x - y).map(m => `<button class="chip-h ${hs.includes(m) ? "on" : ""}" data-a="ed-chip" data-id="${esc(a.id)}" data-m="${m}">${horaTxt(m)}</button>`).join("")}</div></div>`; }).join("")}
    <div class="acciones" style="justify-content:space-between"><span class="fila"><button class="btn btn-peligro btn-sm" data-a="ed-cerrar">Marcar como cerrado</button><button class="btn btn-peligro btn-sm" data-a="ed-quitar">Quitar de la agenda</button></span>
    <span class="fila"><button class="btn btn-blanco" data-a="ed-cancelar">Cancelar</button><button class="btn btn-rosa" data-a="ed-guardar">Guardar ${fin ? diasSel.length + " " + (diasSel.length === 1 ? "día" : "días") : "día"}</button></span></div>`}
  </div></div>`;
}
function diasSeleccionados() {
  const { ini, fin } = P.cal; if (!ini) return [];
  if (!fin) return [ini];
  const out = []; for (let d = ini; d <= fin; d = sumarDias(d, 1)) if (P.ed.dsem.includes(fecha(d).getDay())) out.push(d);
  return out;
}
function cargarEditorDesde(d) {
  const x = diaDoc(d);
  P.ed.horas = x ? structuredClone(x.horas || {}) : {};
  P.ed.estado = x && x.pronto ? "pronto" : "publicado";
}

/* ================= ARTISTAS ================= */
function vArtistas() {
  const arts = artistasOrden();
  const tag = { activa: ["Activa", ""], pronto: ["Próximamente", "oro"], oculta: ["Oculta", "oro"] };
  return `<div class="tarjeta"><div class="fila" style="justify-content:space-between"><h2>Artistas</h2><button class="btn btn-rosa" data-a="art-nueva">+ Agregar artista</button></div>
  <p class="ayuda-txt"><b>Activa:</b> las clientas pueden agendar con ella. <b>Próximamente:</b> aparece pero sin agenda. <b>Oculta:</b> no aparece en la página.</p></div>
  <div class="grid-art">${arts.map((a, i) => `<form class="card-art" data-id="${esc(a.id)}">
    <div class="foto"><img src="${esc(a.foto || "img/logo.webp")}" alt="${esc(a.nombre)}"><span class="estado-tag badge ${tag[a.estado || "activa"][1]}">${tag[a.estado || "activa"][0]}</span>
      <label class="btn btn-blanco btn-sm subir">Cambiar foto<input type="file" accept="image/*" data-a="art-foto" data-id="${esc(a.id)}"></label></div>
    <div class="cuerpo">
      <label class="campo-p" style="margin:0"><span>Nombre</span><input class="inp" name="nombre" value="${esc(a.nombre)}" required></label>
      <label class="campo-p" style="margin:0"><span>Frase</span><input class="inp" name="frase" value="${esc(a.frase || "")}"></label>
      <label class="campo-p" style="margin:0"><span>Estado</span><select name="estado">${Object.entries(tag).map(([k, v]) => `<option value="${k}" ${(a.estado || "activa") === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></label>
      <div class="fila" style="justify-content:space-between"><span class="fila"><button type="button" class="btn btn-blanco btn-sm" data-a="art-mover" data-id="${esc(a.id)}" data-v="-1" ${i === 0 ? "disabled" : ""}>‹</button><button type="button" class="btn btn-blanco btn-sm" data-a="art-mover" data-id="${esc(a.id)}" data-v="1" ${i === arts.length - 1 ? "disabled" : ""}>›</button></span>
      <span class="fila"><button type="button" class="btn btn-peligro btn-sm" data-a="art-borrar" data-id="${esc(a.id)}">Eliminar</button><button class="btn btn-rosa btn-sm" type="submit">Guardar</button></span></div>
    </div></form>`).join("")}</div>`;
}
function mNuevaArtistaHTML() {
  return `<h3>Nueva artista</h3><form id="f-nueva-art">
  <label class="campo-p"><span>Nombre *</span><input class="inp" name="nombre" required></label>
  <label class="campo-p"><span>Frase</span><input class="inp" name="frase" placeholder="Ej: Te consiente como una amiga"></label>
  <label class="campo-p"><span>Foto</span><input class="inp" type="file" name="foto" accept="image/*"></label>
  <div class="acciones"><button type="button" class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-rosa" type="submit">Agregar</button></div></form>`;
}

/* ================= PORTADA Y AJUSTES ================= */
function vAjustes() {
  const N = B.negocio || {};
  return `<form id="f-ajustes">
  <div class="tarjeta"><h2>Temporada</h2>
    <label class="interruptor"><input type="checkbox" name="navidad" ${N.navidad !== false ? "checked" : ""}><span class="pista"></span>
      <span><b>Modo Navidad</b><br><small>Activo: copos de nieve cayendo y esferas navideñas colgando. Apagado: la página queda igual (mismos colores, tipografías y diseño) pero sin los adornos navideños.</small></span></label>
    <p class="ayuda-txt" style="margin-top:10px">Recuerda cambiar también los textos de temporada de la portada (por ejemplo "Esta Navidad").</p></div>
  <div class="tarjeta"><h2>Portada</h2><div class="fila" style="align-items:flex-start;gap:18px">
    <img class="portada-prev" id="prev-portada" src="${esc(N.portada || "img/portada.webp")}" alt="Portada">
    <div style="flex:1;min-width:240px"><p class="ayuda-txt">La foto de portada se ve arriba de la página, con el degradado hacia el fondo. Usa una foto vertical.</p>
      <label class="btn btn-blanco subir">Cambiar foto de portada<input type="file" accept="image/*" data-a="portada-foto"></label>
      <div style="margin-top:14px"><label class="campo-p"><span>Texto pequeño superior</span><input class="inp" name="eyebrow" value="${esc(N.eyebrow || "")}"></label>
      <div class="dos"><label class="campo-p"><span>Título (primera línea)</span><input class="inp" name="tituloChico" value="${esc(N.tituloChico || "")}"></label><label class="campo-p"><span>Título (línea grande)</span><input class="inp" name="tituloGrande" value="${esc(N.tituloGrande || "")}"></label></div>
      <label class="campo-p"><span>Mensaje de bienvenida</span><textarea name="bienvenida">${esc(N.bienvenida || "")}</textarea></label>
      <label class="campo-p"><span>Nota debajo de las semanas</span><input class="inp" name="notaSemanas" value="${esc(N.notaSemanas || "")}" placeholder="Ej: En enero salimos a vacaciones"></label></div></div></div></div>
  <div class="tarjeta"><h2>Negocio</h2><div class="dos">
    <label class="campo-p"><span>Nombre del negocio</span><input class="inp" name="nombre" value="${esc(N.nombre || "")}"></label>
    <label class="campo-p"><span>Instagram</span><input class="inp" name="instagram" value="${esc(N.instagram || "")}"></label>
    <label class="campo-p"><span>WhatsApp (con 57)</span><input class="inp" name="whatsapp" inputmode="tel" value="${esc(N.whatsapp || "")}"></label>
    <label class="campo-p"><span>Valor del abono</span><input class="inp" name="abono" type="number" min="0" step="1000" value="${esc(N.abono ?? "")}"></label></div>
    <label class="campo-p"><span>Link del catálogo de servicios</span><input class="inp" name="catalogo" value="${esc(N.catalogo || "")}"></label></div>
  <div class="tarjeta"><h2>Políticas</h2><p class="ayuda-txt">Escribe <b>{abono}</b> donde quieras que aparezca el valor del abono.</p>
    <div id="pols">${(N.politicas || []).map((p, i) => polEd(p, i)).join("")}</div>
    <button type="button" class="btn btn-blanco btn-sm" data-a="pol-agregar">+ Agregar política</button></div>
  <div class="tarjeta"><h2>Tratamiento de datos</h2><p class="ayuda-txt">Es el texto que lee la clienta al tocar <b>"Leer más"</b> junto a "Acepto el tratamiento de mis datos personales". Deja una línea en blanco entre párrafos; empieza con <b>#</b> y un espacio para un subtítulo y con <b>-</b> y un espacio para una viñeta.</p>
    <textarea name="datos" style="min-height:320px;font-size:13.5px;line-height:1.5">${esc(N.datos || "")}</textarea></div>
  <div class="acciones" style="position:sticky;bottom:12px"><button class="btn btn-rosa" type="submit" style="box-shadow:0 10px 26px rgba(150,90,80,.35)">Guardar cambios</button></div></form>`;
}
const polEd = (p, i) => `<div class="pol-ed" data-i="${i}"><div class="fila" style="justify-content:space-between"><input class="inp" name="pol-t" value="${esc(p.t)}" style="max-width:340px" placeholder="Título"><button type="button" class="btn btn-peligro btn-sm" data-a="pol-quitar">Quitar</button></div><textarea name="pol-p" placeholder="Texto de la política">${esc(p.p)}</textarea></div>`;

/* ================= CONTRASEÑA ================= */
function mClaveHTML() {
  if (D.modo === "demo") return `<h3>Cambiar contraseña</h3><p class="ayuda-txt">En la demostración no hay contraseñas. Con la agenda publicada, aquí la secretaria cambia la suya cuando quiera.</p><div class="acciones"><button class="btn btn-rosa" data-a="m-cerrar">Entendido</button></div>`;
  return `<h3>Cambiar contraseña</h3><form id="f-clave"><p class="ayuda-txt">Usa mínimo 8 caracteres. Solo tú la conocerás.</p>
  <label class="campo-p"><span>Contraseña actual</span><input class="inp" type="password" name="actual" autocomplete="current-password" required></label>
  <label class="campo-p"><span>Nueva contraseña</span><input class="inp" type="password" name="nueva" autocomplete="new-password" minlength="8" required></label>
  <label class="campo-p"><span>Repite la nueva contraseña</span><input class="inp" type="password" name="repetir" autocomplete="new-password" minlength="8" required></label>
  <p class="msg-mal" id="clave-error"></p>
  <div class="acciones"><button type="button" class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-rosa" type="submit">Guardar contraseña</button></div></form>`;
}

/* ================= MODALES ================= */
function pintarModal() {
  const raiz = $("#modal-raiz"), m = P.modal;
  if (!m) { raiz.innerHTML = ""; return; }
  const html = { reservar: mReservarHTML, cita: mCitaHTML, "nueva-cl": mNuevaClientaHTML, visita: mVisitaHTML, "nueva-art": mNuevaArtistaHTML, confirmar: confirmarHTML, clave: mClaveHTML }[m.tipo](m);
  raiz.innerHTML = `<div class="pmodal" data-a="m-fondo"><div class="caja" role="dialog" aria-modal="true"><button class="cerrar" data-a="m-cerrar" aria-label="Cerrar">×</button>${html}</div></div>`;
  const f = raiz.querySelector("input:not([type=hidden]):not([disabled]),select,textarea"); if (f && m.tipo !== "confirmar") f.focus();
}
function cerrarModal() { P.modal = null; pintarModal(); if (P.pendiente) render(true); }
function confirmar(texto, boton, alAceptar) { P.modal = { tipo: "confirmar", texto, boton, alAceptar }; pintarModal(); }
function confirmarHTML(m) { return `<h3>¿Segura?</h3><p style="margin:8px 0 4px;line-height:1.5">${m.texto}</p><div class="acciones"><button class="btn btn-blanco" data-a="m-cerrar">Cancelar</button><button class="btn btn-peligro" data-a="m-aceptar">${esc(m.boton)}</button></div>`; }

/* ================= ESCRITURA ================= */
async function ejecutar(ops, ok) {
  try { for (let i = 0; i < ops.length; i += 400) await D.lote(ops.slice(i, i + 400)); if (ok) toast(ok); return true; }
  catch (e) { console.error(e); toast(e && e.code === "permission-denied" ? "Esta cuenta no tiene permiso para guardar" : "No se pudo guardar. Revisa la conexión"); return false; }
}

/* ================= EVENTOS ================= */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, m = P.modal;
  if (b.tagName === "INPUT" && b.type === "file") return;
  switch (a) {
    case "entrar-demo": await D.entrar(); break;
    case "login-modo": P.login = b.dataset.v; render(true); break;
    case "clave-abrir": P.modal = { tipo: "clave" }; pintarModal(); break;
    case "salir": await D.salir(); break;
    case "demo-reiniciar": confirmar("Se borrarán todos los cambios de la demostración y se cargarán los datos iniciales.", "Reiniciar", () => { D.demoReiniciar(); toast("Demo reiniciada"); }); break;
    case "tab": P.tab = b.dataset.k; render(true); scrollTo(0, 0); break;
    /* agenda */
    case "ag-semana": P.ag.semana = b.dataset.id; render(true); break;
    case "ag-artista": P.ag.artista = b.dataset.id; render(true); break;
    case "celda": { const art = b.dataset.art || P.ag.artista, d = b.dataset.d, h = Number(b.dataset.h), id = slotId(art, d, h);
      if (ocupado(id)) { P.modal = { tipo: "cita", id, art, d, h }; pintarModal(); } else mReservar(art, d, h); break; }
    case "ag-vista": P.ag.vista = b.dataset.v; render(true); break;
    case "ag-dia": P.ag.dia = b.dataset.d; render(true); break;
    case "ag-editar-dia": { const d = b.dataset.d; P.tab = "horarios"; P.cal.mes = d.slice(0, 7); P.cal.ini = d; P.cal.fin = null; cargarEditorDesde(d); render(true); scrollTo(0, 0); break; }
    /* modales */
    case "m-fondo": if (e.target === b) cerrarModal(); break;
    case "m-cerrar": cerrarModal(); break;
    case "m-aceptar": { const f = m.alAceptar; cerrarModal(); await f(); break; }
    case "m-modo": m.modo = b.dataset.v; pintarModal(); break;
    case "m-elegir": m.clienteId = b.dataset.id; pintarModal(); break;
    case "m-quitar-cl": m.clienteId = null; pintarModal(); break;
    case "m-nueva": m.nueva = true; pintarModal(); break;
    case "m-buscar": m.nueva = false; pintarModal(); break;
    case "m-guardar-reserva": await guardarReserva(); break;
    case "m-guardar-cita": { const c = citaDe(m.id); if (!c) { cerrarModal(); break; }
      await ejecutar([{ op: "merge", ruta: "citas/" + m.id, datos: { procedimiento: ($("#m-proc")?.value || "").trim(), nota: ($("#m-nota")?.value || "").trim() } }], "Cambios guardados"); cerrarModal(); break; }
    case "m-liberar": { const id = m.id; confirmar("El horario quedará libre de nuevo para las clientas.", "Liberar horario", () => ejecutar([{ op: "delete", ruta: "ocupados/" + id }, { op: "delete", ruta: "citas/" + id }], "Horario liberado")); break; }
    case "ir-clienta": P.tab = "clientas"; P.cl.sel = b.dataset.id; cerrarModal(); render(true); scrollTo(0, 0); break;
    /* clientas */
    case "cl-sel": P.cl.sel = b.dataset.id; render(true); if (innerWidth < 900) document.querySelector(".crm > div:last-child")?.scrollIntoView({ behavior: "smooth" }); break;
    case "cl-filtro": P.cl.filtro = b.dataset.v; render(true); break;
    case "cl-nueva": P.modal = { tipo: "nueva-cl" }; pintarModal(); break;
    case "cl-visita": P.modal = { tipo: "visita", clienteId: b.dataset.id }; pintarModal(); break;
    case "cl-editar-visita": { const c = citaDe(b.dataset.id); P.modal = { tipo: "visita", clienteId: c.clienteId, id: c.id }; pintarModal(); break; }
    case "v-borrar": { const id = m.id; confirmar("Se eliminará esta visita del historial.", "Eliminar", () => ejecutar([{ op: "delete", ruta: "citas/" + id }], "Visita eliminada")); break; }
    case "cl-borrar": { const id = b.dataset.id, c = clienta(id);
      confirmar(`Se eliminará a <b>${esc(c?.nombre)}</b> del registro de clientas. Su historial de visitas quedará sin clienta asignada.`, "Eliminar clienta", async () => {
        const ops = [{ op: "delete", ruta: "clientas/" + id }];
        for (const x of citasDeClienta(id)) ops.push({ op: "merge", ruta: "citas/" + x.id, datos: { clienteId: null } });
        if (await ejecutar(ops, "Clienta eliminada")) { P.cl.sel = null; render(true); } }); break; }
    /* horarios */
    case "cal-mes": { const [y, mo] = P.cal.mes.split("-").map(Number); const f = new Date(y, mo - 1 + Number(b.dataset.v), 1); P.cal.mes = iso(f).slice(0, 7); render(true); break; }
    case "cal-dia": { const d = b.dataset.d, c = P.cal;
      if (!c.ini || c.fin || d < c.ini) { c.ini = d; c.fin = null; cargarEditorDesde(d); }
      else if (d === c.ini) { c.ini = null; }
      else { c.fin = d; if (!diaDoc(c.ini)) cargarEditorDesde(c.ini); P.ed.estado = "publicado"; }
      render(true); break; }
    case "ed-chip": { const id = b.dataset.id, mm = Number(b.dataset.m), hs = new Set(P.ed.horas[id] || []); hs.has(mm) ? hs.delete(mm) : hs.add(mm); P.ed.horas[id] = [...hs].sort((x, y) => x - y); b.classList.toggle("on"); const badge = b.closest(".ed-art").querySelector(".badge"); badge.textContent = P.ed.horas[id].length + (P.ed.horas[id].length === 1 ? " cita" : " citas"); break; }
    case "ed-copiar-todas": { const src = P.ed.horas[b.dataset.id] || []; artistasAgenda().forEach(x => P.ed.horas[x.id] = src.slice()); render(true); toast("Horario copiado a todas"); break; }
    case "ed-hora-extra": { const id = b.dataset.id, v = document.getElementById("hx-" + id)?.value; if (!v) return toast("Escribe la hora que quieres agregar");
      const [hh, mm] = v.split(":").map(Number), m2 = hh * 60 + mm, hs = new Set(P.ed.horas[id] || []); hs.add(m2); P.ed.horas[id] = [...hs].sort((x, y) => x - y); render(true); toast(horaTxt(m2) + " agregada"); break; }
    case "ed-vaciar": P.ed.horas[b.dataset.id] = []; render(true); break;
    case "ed-limpiar": P.ed.horas = {}; render(true); break;
    case "ed-copiar-dia": { const d = $("#copiar-de").value; if (!d) return toast("Elige un día para copiar"); P.ed.horas = structuredClone(diaDoc(d)?.horas || {}); render(true); toast("Horario copiado de " + diaCorto(d)); break; }
    case "ed-estado": P.ed.estado = b.dataset.v; render(true); break;
    case "ed-cancelar": P.cal.ini = P.cal.fin = null; render(true); break;
    case "ed-guardar": { const ds = diasSeleccionados(); if (!ds.length) return toast("No hay días seleccionados");
      const horas = {}; for (const [k, v] of Object.entries(P.ed.horas)) if (v && v.length) horas[k] = v.slice();
      if (P.ed.estado === "publicado" && !Object.keys(horas).length) return toast("Elige al menos una hora para alguna artista");
      const pisa = ds.filter(d => diaDoc(d)).length;
      const afect = B.ocupados.filter(o => ds.includes(o.fecha) && !(horas[o.artista] || []).includes(o.hora) && !pasada(o.fecha, o.hora));
      if (afect.length) { const lst = afect.map(o => `${esc(artista(o.artista)?.nombre || "")} · ${diaCorto(o.fecha)} ${horaTxt(o.hora)}`).join("<br>");
        confirmar(`Quitaste horas que ya tienen cita o bloqueo:<br><b>${lst}</b><br><br>Esas citas <b>no se borran</b> (siguen en la agenda y en el historial), pero recuerda reagendarlas si es necesario.`, "Guardar igual", async () => { if (await ejecutar(ds.map(d => ({ op: "set", ruta: "dias/" + d, datos: { horas, cerrado: false, pronto: P.ed.estado === "pronto" } })), "Guardado")) { P.cal.ini = P.cal.fin = null; render(true); } }); break; }
      const hacer = async () => { if (await ejecutar(ds.map(d => ({ op: "set", ruta: "dias/" + d, datos: { horas, cerrado: false, pronto: P.ed.estado === "pronto" } })), ds.length === 1 ? "Día guardado" : ds.length + " días guardados")) { P.cal.ini = P.cal.fin = null; render(true); } };
      if (pisa && ds.length > 1) confirmar(`${pisa} de estos días ya tenían horario y se reemplazará. Las citas ya reservadas no se borran.`, "Reemplazar", hacer); else await hacer(); break; }
    case "ed-cerrar": { const ds = diasSeleccionados(); confirmar(`Se marcarán <b>${ds.length}</b> ${ds.length === 1 ? "día" : "días"} como cerrados. Las clientas no podrán agendar.`, "Cerrar días", async () => { if (await ejecutar(ds.map(d => ({ op: "merge", ruta: "dias/" + d, datos: { cerrado: true, pronto: false } })), "Días cerrados")) { P.cal.ini = P.cal.fin = null; render(true); } }); break; }
    case "ed-quitar": { const ds = diasSeleccionados().filter(d => diaDoc(d)); if (!ds.length) return toast("Esos días no están en la agenda");
      confirmar(`Se quitarán <b>${ds.length}</b> ${ds.length === 1 ? "día" : "días"} de la agenda. Las citas ya reservadas se conservan en el historial.`, "Quitar", async () => { if (await ejecutar(ds.map(d => ({ op: "delete", ruta: "dias/" + d })), "Días quitados")) { P.cal.ini = P.cal.fin = null; render(true); } }); break; }
    /* artistas */
    case "art-nueva": P.modal = { tipo: "nueva-art" }; pintarModal(); break;
    case "art-mover": { const arts = artistasOrden(), i = arts.findIndex(x => x.id === b.dataset.id), j = i + Number(b.dataset.v); if (j < 0 || j >= arts.length) break;
      [arts[i], arts[j]] = [arts[j], arts[i]]; await ejecutar(arts.map((x, k) => ({ op: "merge", ruta: "artistas/" + x.id, datos: { orden: k + 1 } }))); break; }
    case "art-borrar": { const x = artista(b.dataset.id); confirmar(`Se eliminará a <b>${esc(x?.nombre)}</b>. Si solo quieres que no aparezca por un tiempo, mejor cámbiala a <b>Oculta</b>.`, "Eliminar artista", () => ejecutar([{ op: "delete", ruta: "artistas/" + x.id }], "Artista eliminada")); break; }
    /* ajustes */
    case "pol-agregar": { const c = $("#pols"); c.insertAdjacentHTML("beforeend", polEd({ t: "", p: "" }, c.children.length)); marcarSucio(c); break; }
    case "pol-quitar": { const c = b.closest(".pol-ed"); marcarSucio(c.parentElement); c.remove(); break; }
  }
});

/* entradas con archivos */
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.matches("[data-a=art-foto]") && t.files[0]) {
    try { const url = await D.comprimirImagen(t.files[0], 640); await ejecutar([{ op: "merge", ruta: "artistas/" + t.dataset.id, datos: { foto: url } }], "Foto actualizada"); }
    catch (err) { toast(err.message); }
  }
  if (t.matches("[data-a=portada-foto]") && t.files[0]) {
    try { const url = await D.comprimirImagen(t.files[0], 1100, 0.8); $("#prev-portada").src = url; $("#f-ajustes").dataset.portada = url; marcarSucio($("#f-ajustes")); toast("Foto lista. Recuerda guardar los cambios"); }
    catch (err) { toast(err.message); }
  }
  if (t.matches("[data-a=ed-dsem]")) { const k = Number(t.dataset.k); P.ed.dsem = t.checked ? [...new Set([...P.ed.dsem, k])] : P.ed.dsem.filter(x => x !== k); render(true); }
});

/* escritura en formularios: marcar como "sin guardar" para no perder lo escrito si llegan cambios */
const marcarSucio = el => { const f = el.closest("form"); if (f) f.dataset.sucio = "1"; };
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "cl-q") { P.cl.q = t.value; const pos = t.selectionStart; render(true); const i = $("#cl-q"); i.focus(); i.setSelectionRange(pos, pos); return; }
  if (t.id === "m-q") { P.modal.q = t.value; const pos = t.selectionStart; pintarModal(); const i = $("#m-q"); i.focus(); i.setSelectionRange(pos, pos); return; }
  if (t.closest("#contenido form")) marcarSucio(t);
});

document.addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, fd = new FormData(f), v = k => String(fd.get(k) ?? "").trim();
  if (f.id === "f-login") {
    try { $("#login-error").textContent = ""; await D.entrar(v("correo"), String(fd.get("clave"))); }
    catch (err) { $("#login-error").textContent = "Correo o contraseña incorrectos."; }
  }
  else if (f.id === "f-enlace") {
    const caja = $("#enlace-msg"), btn = f.querySelector("[type=submit]"); btn.disabled = true; caja.innerHTML = "";
    try { await D.enviarEnlaceClave(v("correo"));
      caja.innerHTML = `<div class="msg-ok">Listo. Si este correo tiene acceso al panel, te llegará un mensaje con el enlace para crear tu contraseña. Revisa también <b>spam</b> o <b>promociones</b>. Después vuelve aquí y entra con tu correo y tu nueva contraseña.</div>`; }
    catch (err) { console.error(err); caja.innerHTML = `<p class="msg-mal">${err && err.code === "auth/invalid-email" ? "Revisa el correo, parece que está mal escrito." : err && err.code === "auth/too-many-requests" ? "Hiciste muchos intentos. Espera unos minutos e intenta otra vez." : "No se pudo enviar el enlace. Revisa tu conexión e intenta de nuevo."}</p>`; }
    btn.disabled = false;
  }
  else if (f.id === "f-clave") {
    const err = $("#clave-error"), nueva = String(fd.get("nueva")), rep = String(fd.get("repetir")); err.textContent = "";
    if (nueva.length < 8) { err.textContent = "La nueva contraseña debe tener mínimo 8 caracteres."; return; }
    if (nueva !== rep) { err.textContent = "Las dos contraseñas nuevas no coinciden."; return; }
    try { await D.cambiarClave(String(fd.get("actual")), nueva); cerrarModal(); toast("Contraseña actualizada"); }
    catch (e2) { console.error(e2); const c = e2 && e2.code;
      err.textContent = c === "auth/wrong-password" || c === "auth/invalid-credential" || c === "auth/invalid-login-credentials" ? "La contraseña actual no es correcta." : c === "auth/weak-password" ? "Esa contraseña es muy débil. Prueba con una más larga." : c === "auth/too-many-requests" ? "Hiciste muchos intentos. Espera unos minutos." : "No se pudo cambiar. Revisa tu conexión e intenta de nuevo."; }
  }
  else if (f.id === "f-clienta") {
    if (v("nombre").length < 2) return toast("Escribe el nombre");
    const id = f.dataset.id, nombre = v("nombre");
    const ops = [{ op: "merge", ruta: "clientas/" + id, datos: { nombre, telefono: v("telefono"), cumple: v("cumple"), correo: v("correo"), notas: v("notas") } }];
    for (const c of citasDeClienta(id)) if (c.clienteNombre !== nombre) ops.push({ op: "merge", ruta: "citas/" + c.id, datos: { clienteNombre: nombre } });
    delete f.dataset.sucio; await ejecutar(ops, "Datos guardados"); render(true);
  }
  else if (f.id === "f-nueva-cl") {
    if (v("nombre").length < 2) return toast("Escribe el nombre");
    const id = "c" + D.uid();
    if (await ejecutar([{ op: "set", ruta: "clientas/" + id, datos: { nombre: v("nombre"), telefono: v("telefono"), cumple: v("cumple"), correo: v("correo"), notas: v("notas"), creado: Date.now() } }], "Clienta creada")) { P.cl.sel = id; P.tab = "clientas"; cerrarModal(); render(true); }
  }
  else if (f.id === "f-visita") {
    const m = P.modal, c = clienta(m.clienteId);
    const datos = { artista: v("artista"), procedimiento: v("procedimiento"), nota: v("nota"), clienteId: m.clienteId, clienteNombre: c?.nombre || "" };
    if (!m.id || !ocupado(m.id)) datos.fecha = v("fecha");
    if (!datos.procedimiento) return toast("Escribe el procedimiento");
    const id = m.id || "v" + D.uid();
    if (!m.id) { datos.hora = null; datos.manual = true; datos.creado = Date.now(); }
    if (await ejecutar([{ op: m.id ? "merge" : "set", ruta: "citas/" + id, datos }], "Visita guardada")) cerrarModal();
  }
  else if (f.classList.contains("card-art")) {
    if (v("nombre").length < 1) return toast("Escribe el nombre");
    delete f.dataset.sucio;
    await ejecutar([{ op: "merge", ruta: "artistas/" + f.dataset.id, datos: { nombre: v("nombre"), frase: v("frase"), estado: v("estado") } }], "Artista guardada"); render(true);
  }
  else if (f.id === "f-nueva-art") {
    const nombre = v("nombre"); if (!nombre) return toast("Escribe el nombre");
    let foto = "img/logo.webp"; const arch = fd.get("foto");
    if (arch && arch.size) { try { foto = await D.comprimirImagen(arch, 640); } catch (err) { return toast(err.message); } }
    const base = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artista";
    const id = B.artistas.some(a => a.id === base) ? base + "-" + D.uid().slice(-4) : base;
    if (await ejecutar([{ op: "set", ruta: "artistas/" + id, datos: { nombre, frase: v("frase"), foto, estado: "activa", orden: B.artistas.length + 1 } }], "Artista agregada")) cerrarModal();
  }
  else if (f.id === "f-ajustes") {
    const pols = [...f.querySelectorAll(".pol-ed")].map(p => ({ t: p.querySelector("[name=pol-t]").value.trim(), p: p.querySelector("[name=pol-p]").value.trim() })).filter(p => p.t || p.p);
    const datos = { navidad: fd.get("navidad") === "on", eyebrow: v("eyebrow"), tituloChico: v("tituloChico"), tituloGrande: v("tituloGrande"), bienvenida: v("bienvenida"), notaSemanas: v("notaSemanas"),
      nombre: v("nombre"), instagram: v("instagram"), whatsapp: telLimpio(v("whatsapp")), abono: Number(v("abono")) || 0, catalogo: v("catalogo"), politicas: pols, datos: String(fd.get("datos") ?? "").trim() };
    if (f.dataset.portada) datos.portada = f.dataset.portada;
    delete f.dataset.sucio; await ejecutar([{ op: "merge", ruta: "config/negocio", datos }], "Cambios guardados"); render(true);
  }
});

/* ================= ARRANQUE ================= */
function suscribir() {
  desuscribir.forEach(u => u()); desuscribir = [];
  const err = e => { console.error(e); toast("Error al leer los datos"); };
  desuscribir.push(D.escuchar("config/negocio", d => { B.negocio = d; render(); }, null, err));
  desuscribir.push(D.escuchar("artistas", l => { B.artistas = l; render(); }, null, err));
  desuscribir.push(D.escuchar("dias", l => { B.dias = l; render(); }, null, err));
  desuscribir.push(D.escuchar("ocupados", l => { B.ocupados = l; render(); if (P.modal && P.modal.tipo === "reservar" && ocupado(slotId(P.modal.art, P.modal.d, P.modal.h))) { toast("Ese horario se acaba de ocupar"); cerrarModal(); } }, null, err));
  desuscribir.push(D.escuchar("citas", l => { B.citas = l; render(); }, null, err));
  desuscribir.push(D.escuchar("clientas", l => { B.clientas = l; render(); }, null, err));
}
(async () => {
  try { await D.iniciar(); }
  catch (e) { console.error(e); $("#app").innerHTML = `<div class="cargando"><p>No se pudo conectar con la base de datos.</p></div>`; return; }
  D.alCambiarSesion(async u => {
    P.usuario = u;
    if (u) { try { if (await D.sembrarSiVacio()) toast("Datos iniciales cargados"); } catch (e) { console.error(e); } suscribir(); }
    else { desuscribir.forEach(x => x()); desuscribir = []; }
    render(true);
  });
})();
