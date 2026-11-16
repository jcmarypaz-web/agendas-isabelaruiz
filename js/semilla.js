/* Datos iniciales del sistema · Centro Estético Isabela Ruiz
   Se cargan UNA sola vez, la primera vez que la secretaria entra al panel con la base vacía.
   Después, todo se edita desde el panel (Horarios, Artistas, Portada y ajustes). */

export const NEGOCIO = {
  nombre: "Centro Estético Isabela Ruiz",
  instagram: "@centroesteticoisabelaruiz",
  whatsapp: "573004993801",
  catalogo: "catalogo.pdf",
  abono: 20000,
  navidad: true,           // modo temporada: destellos y esferas navideñas
  portada: "img/portada.webp",
  eyebrow: "Agenda navideña 2026",
  tituloChico: "Esta Navidad",
  tituloGrande: "Luce radiante",
  bienvenida: "Llega a las fiestas con tu mejor versión. Elige tu semana, tu especialista y tu horario: resultados naturales, con la calidez de siempre.",
  notaSemanas: "Abrimos la agenda por semanas. ¡Separa tu cita a tiempo!",
  politicas: [
    { t: "Anticipo", p: "Para separar tu cita realizas un abono mínimo de {abono}. Tu cita queda confirmada únicamente por WhatsApp, cuando recibamos tu abono." },
    { t: "Puntualidad", p: "Te recomendamos llegar 10 minutos antes de tu cita. Contamos con tiempos establecidos para garantizarte una atención de calidad." },
    { t: "Cancelaciones y cambios", p: "Si necesitas cancelar o modificar tu cita, avísanos con al menos 24 horas de anticipación para reagendarla. No se hacen devoluciones de abonos." },
    { t: "Acompañantes", p: "Para mantener un ambiente cómodo y tranquilo, agradecemos que asistas sin acompañantes, salvo situaciones previamente autorizadas." }
  ],
  /* Autorización de tratamiento de datos (Ley 1581 de 2012). Editable en Portada y ajustes.
     Formato: bloques separados por una línea en blanco; "# " = subtítulo; "- " = viñeta. */
  datos: `En cumplimiento de la Ley Estatutaria 1581 de 2012 y del Decreto 1377 de 2013 (hoy compilado en el Decreto 1074 de 2015), te contamos cómo cuidamos tus datos personales.

# Responsable del tratamiento
Centro Estético Isabela Ruiz, con domicilio en Medellín, Colombia. Contacto: WhatsApp 300 499 3801 · Instagram @centroesteticoisabelaruiz.

# Datos que recolectamos
- Tu nombre.
- Tu número de celular / WhatsApp (lo obtenemos cuando nos escribes).
- El servicio que te interesa y los datos de tus citas (fechas, especialista y procedimientos).
- La fecha de tu cumpleaños, si decides compartirla.

# Para qué los usamos
- Agendar, confirmar, reprogramar y recordarte tus citas.
- Atenderte y hacer el seguimiento de tu tratamiento o procedimiento.
- Enviarte por WhatsApp, llamada o redes sociales información de nuestros servicios, promociones, beneficios, descuentos y saludos especiales (por ejemplo, en tu cumpleaños).
- Hacer encuestas de satisfacción para mejorar nuestra atención.

# Lo que NO hacemos
Centro Estético Isabela Ruiz no vende, no comparte, no cede ni difunde tus datos personales a terceros. Tu información se usa únicamente para atenderte, darte beneficios y hacerte seguimiento comercial dentro de lo que permite la ley. Solo la conoce nuestro equipo y la guardamos con medidas de seguridad para evitar su pérdida o uso no autorizado.

# Datos de salud (datos sensibles)
Si durante tu valoración o tus conversaciones nos compartes información sobre tu salud, ten en cuenta que es un dato sensible: no estás obligada a suministrarla. Si lo haces, la usaremos solo para tu valoración, tu atención y tu seguridad durante el procedimiento.

# Tus derechos como titular (artículo 8 de la Ley 1581 de 2012)
- Conocer, actualizar y rectificar tus datos personales.
- Pedir prueba de la autorización que nos diste.
- Saber qué uso le hemos dado a tus datos.
- Revocar esta autorización o pedir que eliminemos tus datos cuando no exista un deber legal o contractual de conservarlos.
- Dejar de recibir mensajes comerciales en cualquier momento, sin que eso afecte tus citas.
- Acceder gratis a tus datos personales.
- Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).

# Cómo ejercer tus derechos
Escríbenos al WhatsApp 300 499 3801. Atenderemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, como indica la ley.

# Vigencia
Conservamos tus datos mientras tengas una relación con nosotras y durante el tiempo necesario para cumplir las finalidades descritas, o hasta que nos pidas eliminarlos.

Al marcar la casilla "Acepto el tratamiento de mis datos" autorizas de forma previa, expresa e informada a Centro Estético Isabela Ruiz para tratar tus datos con las finalidades descritas.`
};

export const ARTISTAS = [
  { id: "trabajadora1", nombre: "trabajadora1", frase: "Resultados naturales a tu medida",  foto: "img/artistas/trabajadora1.webp", estado: "activa", orden: 1 },
  { id: "trabajadora2", nombre: "trabajadora2", frase: "Te escuchamos y te acompañamos",    foto: "img/artistas/trabajadora2.webp", estado: "activa", orden: 2 },
  { id: "trabajadora3", nombre: "trabajadora3", frase: "Tu piel en las mejores manos",      foto: "img/artistas/trabajadora3.webp", estado: "activa", orden: 3 }
];

/* =========================================================
   AGENDA INICIAL (17 nov – 31 dic de 2026)
   Horario semanal de atención (igual para las tres):
     Lunes 10:00 a.m. – 4:30 p.m.
     Martes a viernes 8:00 a.m. – 4:30 p.m.
     Sábado 10:00 a.m. – 2:00 p.m.
     Domingos y festivos: no se atiende (se pueden habilitar desde el panel).
   Citas cada hora, con 1 hora de almuerzo entre semana.
   ========================================================= */
const t_ = s => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
const iso = f => f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");

/* 0 = domingo … 6 = sábado */
const SEMANA = { 1: "10:00-16:30", 2: "8:00-16:30", 3: "8:00-16:30", 4: "8:00-16:30", 5: "8:00-16:30", 6: "10:00-14:00" };
const DESDE = "2026-11-17", HASTA = "2026-12-31";
const FESTIVOS = ["2026-12-08", "2026-12-25"];
const NO_LABORA = {};    // ej: { trabajadora2: ["2026-12-24"] }
const RITMO = {
  trabajadora1: { duracion: 60, almuerzo: 60 },
  trabajadora2: { duracion: 60, almuerzo: 60 },
  trabajadora3: { duracion: 60, almuerzo: 60 }
};

/* Cupos desde la hora de inicio, cada `duracion`, sin pasar del cierre.
   El almuerzo se toma después de la primera cita que termina a las 12:00 o más tarde
   (solo en jornadas que pasan de las 2:00 p.m.). */
function cupos(rango, { duracion, almuerzo }) {
  const [ini, fin] = rango.split("-").map(t_), out = [];
  let h = ini, comio = !almuerzo || fin <= 14 * 60;
  while (h + duracion <= fin) { out.push(h); h += duracion; if (!comio && h >= 12 * 60) { h += almuerzo; comio = true; } }
  return out;
}

function construirDias() {
  const out = {};
  const [y, m, d] = DESDE.split("-").map(Number);
  for (let f = new Date(y, m - 1, d); iso(f) <= HASTA; f.setDate(f.getDate() + 1)) {
    const k = iso(f), rango = SEMANA[f.getDay()];
    if (!rango || FESTIVOS.includes(k)) continue;
    const horas = {};
    for (const [a, r] of Object.entries(RITMO)) if (!(NO_LABORA[a] || []).includes(k)) horas[a] = cupos(rango, r);
    out[k] = { horas, cerrado: false, pronto: false };
  }
  return out;
}
export const DIAS = construirDias();
