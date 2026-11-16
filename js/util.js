/* Utilidades compartidas entre la página de clientas y el panel */
export const DIAS_N = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_C = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const iso = f => f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
export const fecha = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const hoyISO = () => iso(new Date());
export const sumarDias = (s, n) => { const f = fecha(s); f.setDate(f.getDate() + n); return iso(f); };
export const lunesDe = s => { const f = fecha(s); const dw = (f.getDay() + 6) % 7; f.setDate(f.getDate() - dw); return iso(f); };
export const horaTxt = m => { const h = Math.floor(m / 60), mi = m % 60, h12 = ((h + 11) % 12) + 1; return h12 + ":" + String(mi).padStart(2, "0") + " " + (h < 12 ? "a.m." : "p.m."); };
export const diaLargo = s => { const f = fecha(s); return DIAS_N[f.getDay()] + " " + f.getDate() + " de " + MESES[f.getMonth()]; };
export const diaCorto = s => { const f = fecha(s); return f.getDate() + " " + MESES_C[f.getMonth()]; };
export const slotId = (a, d, m) => a + "__" + d + "__" + String(m).padStart(4, "0");
export const pesos = n => "$" + Number(n || 0).toLocaleString("es-CO");

/* "16 – 21 nov" o "30 nov – 5 dic" */
export function rangoTxt(d1, d2) {
  const a = fecha(d1), b = fecha(d2);
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MESES_C[b.getMonth()]}` : `${a.getDate()} ${MESES_C[a.getMonth()]} – ${b.getDate()} ${MESES_C[b.getMonth()]}`;
}

/* ¿ya pasó esta fecha/hora? */
export function pasada(d, m) {
  const h = hoyISO(); if (d < h) return true;
  if (d === h && m != null) { const n = new Date(); return m <= n.getHours() * 60 + n.getMinutes(); }
  return false;
}

/* Agrupa los días configurados en semanas (lunes a domingo) */
export function semanasDe(dias, desde) {
  const map = new Map();
  for (const d of dias) {
    if (desde && d.id < desde) continue;
    const l = lunesDe(d.id);
    if (!map.has(l)) map.set(l, []);
    map.get(l).push(d);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([lunes, ds]) => {
    ds.sort((a, b) => a.id.localeCompare(b.id));
    return { id: lunes, dias: ds, desde: ds[0].id, hasta: ds[ds.length - 1].id };
  });
}

export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800);
}

export const CORONA = `<svg class="corona" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A0625A"/><stop offset=".4" stop-color="#D99F92"/><stop offset=".55" stop-color="#F8DCD4"/><stop offset="1" stop-color="#A86A61"/></linearGradient></defs><path d="M20 2 C21.2 13 27 18.8 38 20 C27 21.2 21.2 27 20 38 C18.8 27 13 21.2 2 20 C13 18.8 18.8 13 20 2 Z" fill="url(#go)"/></svg>`;

const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#B06F64" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONOS_POL = [
  svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>'),
  svg('<circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 2M5 4 3 6M19 4l2 2"/>'),
  svg('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/>'),
  svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.5.3 4.5 2.6 4.5 5.5"/>'),
  svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>')
];

export function nieve(conNieve = true) {
  const n = document.getElementById("nieve"); if (!n) return;
  n.innerHTML = "";
  const sim = ["❄", "✦", "❅", "✧"];
  for (let i = 0; i < (conNieve ? 22 : 0); i++) {
    const c = document.createElement("span"); c.className = "copo" + (i % 3 === 1 ? " oro" : ""); c.textContent = sim[i % sim.length];
    c.style.left = Math.random() * 100 + "vw"; c.style.fontSize = (9 + Math.random() * 12) + "px";
    c.style.animationDuration = (9 + Math.random() * 12) + "s"; c.style.animationDelay = (-Math.random() * 20) + "s"; n.appendChild(c);
  }
  for (let i = 0; i < 10; i++) {
    const d = document.createElement("span"); d.className = "destello";
    d.style.left = Math.random() * 100 + "vw"; d.style.top = Math.random() * 100 + "vh"; d.style.animationDelay = (Math.random() * 2.6) + "s"; n.appendChild(d);
  }
}
