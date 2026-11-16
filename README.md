# Agenda · Centro Estético Isabela Ruiz

Agenda web de reservas del Centro Estético Isabela Ruiz (Medellín), hecha por **Redyz · By Marypaz Cadavid**.

- **Clientas:** `index.html`
- **Panel de la secretaria:** `panel.html`

## Cómo funciona

1. La clienta elige semana → especialista → día → hora, acepta las políticas y la autorización de tratamiento de datos (Ley 1581 de 2012) y envía su solicitud por WhatsApp.
2. La cita **solo se confirma por WhatsApp** después del abono.
3. La secretaria entra a `panel.html` con su correo y **su propia contraseña**:
   - La primera vez toca **"Crear mi contraseña"**, escribe su correo y le llega un enlace para crearla. El mismo botón sirve si la olvida.
   - Con la sesión abierta puede cambiarla en **"Cambiar contraseña"**.
4. El panel tiene Agenda, Clientas, Horarios, Artistas y Portada y ajustes (incluye el texto de tratamiento de datos).

## Archivos

- `index.html` + `js/clientas.js`: página pública.
- `panel.html` + `js/panel.js`: panel de la secretaria.
- `js/datos.js`: conexión a Firebase (Firestore + Authentication).
- `js/semilla.js`: datos iniciales (se cargan solos la primera vez que la secretaria entra con la base vacía).
- `js/firebase-config.js`: config del proyecto de Firebase.
- `css/estilos.css` y `css/panel.css`: tema rosa crema y oro rosa (Bodoni Moda + Great Vibes + Montserrat).
- `catalogo.pdf`: catálogo de servicios 2026.

## Seguridad (reglas de Firestore)

- Públicas (solo lectura): `config`, `artistas`, `dias`, `ocupados` (sin datos personales).
- Privadas: `citas` y `clientas`; solo usuarias con sesión iniciada.
- El registro libre está desactivado: Redyz agrega el correo de la secretaria en Authentication → Usuarios y ella crea su contraseña con el enlace.
