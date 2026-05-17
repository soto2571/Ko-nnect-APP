# Ko-nnecta' — MVP Tracker

App de turnos para pequeños negocios puertorriqueños (2–15 empleados).
Reemplaza papel, Excel y WhatsApp. UI en español.

---

## Estado general

| Plataforma | Estado |
|------------|--------|
| App movil (iOS/Android) | Funcional — en desarrollo activo |
| Web dashboard | Funcional — en desarrollo activo |
| Backend (Supabase Edge Functions) | 31 funciones desplegadas |
| Base de datos | Schema completo, migraciones aplicadas |
| Autenticacion | Email OTP + Google OAuth |
| Crash reporting | Sentry configurado (mobile + web) |

---

## Lo que esta completo

### Autenticacion
- [x] Login con email y contrasena
- [x] Login con Google (OAuth)
- [x] Registro con verificacion OTP por email (SendGrid)
- [x] Requisitos de contrasena en tiempo real (web + mobile)
- [x] Olvidaste tu contrasena (web — flujo PKCE completo)
- [x] Reset de contrasena (web — pagina con panel de marca)
- [x] Deteccion de proveedor (bloquea crear cuenta manual si ya existe con Google)
- [ ] Login con Apple — pendiente (requiere Apple Developer $100/año)

### Roles y navegacion
- [x] Rol dueno — acceso completo
- [x] Rol admin — acceso a turnos, empleados y timeclock, sin configuracion del negocio
- [x] Rol empleado — solo sus turnos y perfil
- [x] Navegacion por rol (redirect automatico segun rol)
- [x] Onboarding forzado si mustChangePassword = true

### Gestion de turnos
- [x] Crear, editar y eliminar turnos (mobile + web)
- [x] Asignar turnos a empleados
- [x] Deteccion de conflictos de turno
- [x] Turnos nocturnos (overnight)
- [x] Creacion masiva (mismo turno multiples dias)
- [x] Vista semanal y mensual
- [x] Duracion de break configurable por turno

### Gestion de empleados
- [x] Agregar, editar y eliminar empleados
- [x] Credenciales auto-generadas (email + contrasena)
- [x] Soft-delete (empleados desactivados, no borrados)
- [x] Copiar credenciales al portapapeles
- [x] Reset de PIN

### Timeclock
- [x] Marcar entrada
- [x] Iniciar break
- [x] Regresar de break
- [x] Marcar salida
- [x] Validacion de geofence (ubicacion o PIN de respaldo)
- [x] Vista de logs por periodo de pago (dueno/admin)
- [x] Vista de mis turnos (empleado)

### Configuracion del negocio
- [x] Nombre y color del negocio
- [x] Configuracion de geofence (mapa, radio, PIN)
- [x] Permisos de ubicacion declarados en app.json (iOS + Android)
- [x] Periodo de nomina (semanal, bisemanal, quincenal)
- [x] Dia de inicio del periodo

### Infraestructura
- [x] 31 edge functions desplegadas con --no-verify-jwt
- [x] SendGrid como SMTP para emails en produccion
- [x] Sentry crash reporting (mobile + web)
- [x] RLS policies en Supabase
- [x] E2E tests (131 Playwright tests, web)
- [x] 6 suites de tests backend

---

## En progreso

### Push notifications
- [x] Instalar expo-notifications
- [x] Pedir permiso de notificaciones al login
- [x] Guardar token del dispositivo en base de datos (push-token-save)
- [x] Notificar al dueno: clock-in, break, regreso de break, clock-out
- [x] Notificar al dueno: empleado llego tarde (+5 min, detectado en clock-in)
- [x] Settings del dueno: 4 toggles (entrada, break, salida, llego tarde)
- [x] Perfil del empleado: opt-in de recordatorios (inicio de turno, recordatorio de salida)
- [ ] No marco entrada — requiere cron job, diferido para post-launch

---

## Pendiente pre-launch

### Empleados ven su sueldo estimado
- [ ] Pantalla de empleado muestra horas trabajadas en el periodo actual
- [ ] Calculo de sueldo estimado (horas x tarifa por hora)
- [ ] Toggle del dueno para mostrar u ocultar el sueldo a los empleados
- [ ] Campo de tarifa por hora en el perfil del empleado

### Export PDF de horarios
- [ ] Mobile: usar expo-print para generar PDF de la semana
- [ ] Web: libreria PDF para exportar desde el dashboard
- [ ] El dueno selecciona el rango de fechas a exportar

### Empleados sin app
- [ ] Opcion "empleado sin app" en el perfil del empleado
- [ ] Los turnos asignados se asumen como trabajados automaticamente
- [ ] El dueno puede marcar falta o ajustar horas manualmente
- [ ] Los timelogs se generan desde el shift en vez del clock-in

---

## Pendiente post-launch

### Login con Apple
- [ ] Requiere Apple Developer Account ($100/ano)
- [ ] Obligatorio para estar en el App Store con Google login activo
- [ ] Planear antes de la submission al App Store

### Pantalla de cobro / monetizacion
- [ ] Definir modelo: freemium, prueba gratis, pago por empleado, etc.
- [ ] iOS: In-App Purchase obligatorio para suscripciones (Apple toma 30%)
- [ ] Web: Stripe sin comision de Apple
- [ ] Planear antes de querer monetizar

### Analytics
- [ ] Tracking de uso (que pantallas visitan, que acciones hacen)
- [ ] Metricas de retencion
- [ ] Posibles opciones: PostHog, Mixpanel, o Expo Analytics

### Modo offline (decidido: no es prioridad)
- [ ] El app requiere conexion activa — si falla, el dueno ajusta manualmente

---

## Descartado / fuera de alcance MVP

- Disponibilidad de empleados (funciones backend existen, sin UI — Fase 2)
- PTO / dias libres (funciones backend existen, sin UI — Fase 2)
- Notificaciones por SMS
- Multi-negocio por usuario
- Integracion con nomina externa (QuickBooks, etc.)

---

## Cuenta demo para Apple Review

Cuando se someta al App Store:
- Crear usuario dueno demo en produccion
- Crear un negocio demo con empleados de prueba
- Incluir credenciales en App Store Connect > App Review Information
- Agregar nota: "Password recovery is handled via email link and completed on the web dashboard"

---

## Servicios externos activos

| Servicio | Uso | Plan |
|----------|-----|------|
| Supabase | Base de datos, Auth, Edge Functions | Free / Pro |
| SendGrid | Envio de emails (OTP, reset) | Free |
| Sentry | Crash reporting mobile + web | Free |
| Expo | Build, distribucion, push notifications | Free |
| GitHub | Control de versiones | Free |

---

## Notas tecnicas importantes

- Nunca usar `--no-verify-jwt` en produccion si se quita la flag de Supabase — sin ella el gateway rechaza todas las requests antes de que la funcion corra
- El token de auth se guarda manualmente en SecureStore (`konnect_token`, `konnect_refresh`) — no usar `persistSession: true` en el cliente de Supabase
- Edge functions corren en Deno — usar `https://esm.sh/` imports, no `npm:`
- DSN de Sentry mobile: `https://43ccf95b1...sentry.io/4511401496412160`
- DSN de Sentry web: `https://036cada8...sentry.io/4511401504210944`
- SendGrid SMTP configurado en Supabase con `konnectapp.pr@gmail.com`
