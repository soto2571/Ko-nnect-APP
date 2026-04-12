# Ko-nnecta'

App móvil de manejo de turnos para negocios pequeños y medianos de Puerto Rico (2–15 empleados).  
Reemplaza el papel, el Excel y los mensajes de WhatsApp para coordinar horarios.

**Idioma de la interfaz:** Español  
**Tagline:** "Turnos sin complique"

---

## ¿Para quién es Ko-nnecta'?

Ko-nnecta' está diseñada para el patrono puertorriqueño que maneja su equipo sin un sistema de recursos humanos formal — restaurantes, salones, tiendas, talleres, clínicas pequeñas y cualquier negocio donde los turnos se coordinan por WhatsApp o en papel. La app le da al dueño control total del horario desde el celular, y al empleado una vista clara de sus turnos sin tener que preguntarle a nadie.

---

## Tecnología utilizada

| Capa | Tecnología |
|---|---|
| Frontend | React Native + Expo + TypeScript (expo-router) |
| Backend | Supabase Edge Functions (runtime Deno) |
| Autenticación | Supabase Auth — JWT guardado en `expo-secure-store` |
| Base de datos | Supabase Postgres |

---

## Estructura del proyecto

```
Ko-nnect-APP/
├── frontend/
│   ├── app/
│   │   ├── (auth)/           # login.tsx, signup.tsx, employee-login.tsx, role-select.tsx
│   │   ├── (owner)/          # index.tsx (tablero), employees.tsx, timeclock.tsx, settings.tsx
│   │   └── (employee)/       # index.tsx (mis turnos), profile.tsx
│   ├── components/           # AnimatedBackground, GoogleLogo, GlassCard
│   ├── context/              # AuthContext.tsx — fuente única de verdad para usuario/negocio/color
│   ├── services/             # api.ts — todas las llamadas a la API
│   ├── types/                # index.ts — tipos TypeScript compartidos
│   └── lib/                  # supabase.ts — cliente de Supabase
└── supabase/
    └── functions/
        ├── _shared/          # cors.ts, supabase.ts (getServiceClient, getUserClient)
        └── [31 funciones]    # una carpeta por edge function
```

---

## Roles

- **owner (dueño)** — crea el negocio, maneja empleados, turnos y registros de tiempo
- **employee (empleado)** — ve únicamente sus propios turnos, sin acceso a datos del negocio

---

## Flujo de autenticación

### Opciones de acceso para el dueño
1. **Google OAuth** — opción recomendada; Google maneja la contraseña
2. **Correo + contraseña** — credenciales creadas manualmente al registrarse

### Manejo de tokens
- Tokens guardados manualmente vía `expo-secure-store` (`konnect_token`, `konnect_refresh`)
- `AuthContext` restaura la sesión al iniciar la app con `supabase.auth.setSession()`
- `getValidToken()` en `api.ts` refresca el token antes de cada solicitud
- `onAuthStateChange('TOKEN_REFRESHED')` sincroniza los nuevos tokens a SecureStore

### Acceso de empleados
- Credenciales generadas automáticamente al añadir el empleado: `nombre.apellido@nombregocio.app`
- Contraseña por defecto: `nombresapellido` + 4 dígitos aleatorios
- Guardada en el campo `tempPassword` del registro del empleado
- Sin colisión: itera sufijo (`john.smith2@...`) si el correo ya existe
- Los empleados acceden por una pantalla separada (`employee-login.tsx`)

### Recuperación de contraseña
- Si el correo está vinculado a Google, la app detecta el proveedor y le indica al usuario que use "Continuar con Google" — no se envía enlace de recuperación
- Si es cuenta de correo, Supabase envía el enlace de restablecimiento normalmente

---

## Edge Functions (31 en total)

Todas las funciones se despliegan con `--no-verify-jwt`. La autenticación se verifica dentro de cada función con `getUserClient(auth).auth.getUser()`.

| Dominio | Funciones |
|---|---|
| Auth | `auth-login`, `auth-signup`, `auth-profile`, `auth-change-password`, `auth-check-provider` |
| Negocio | `business-create`, `business-get`, `business-update` |
| Empleados | `employees-add`, `employees-list`, `employees-update`, `employees-delete`, `employees-reset-pin` |
| Turnos | `shifts-create`, `shifts-get`, `shifts-assign`, `shifts-delete`, `shifts-my` |
| Reloj de tiempo | `timelog-clock-in`, `timelog-clock-out`, `timelog-break-start`, `timelog-break-end`, `timelog-list`, `timelog-my`, `timelog-active`, `timelog-update` |
| Disponibilidad | `availability-set`, `availability-get` |
| PTO | `pto-add`, `pto-list` |

**Desplegar todas las funciones:**
```bash
npx supabase functions deploy --no-verify-jwt --project-ref izfcsiqucpkroylkgjei
```

**Desplegar una función específica:**
```bash
npx supabase functions deploy <nombre-funcion> --no-verify-jwt --project-ref izfcsiqucpkroylkgjei
```

---

## Convenciones de UI

- **`AnimatedBackground`** — siempre usar para fondos de pantalla, nunca `LinearGradient` directamente
  - Pantallas de auth: base blanca/rosada con blobs del color de marca (`primaryColor={BRAND}`)
  - Pantallas de la app: pasar `primaryColor` desde `useAuth()` para coincidir con el color del negocio
- **`GoogleLogo`** — usar para botones de Google, nunca una "G" de texto plano
- **`GlassCard`** — usar para contenedores de tarjetas en toda la app
- **Constante de marca** en pantallas de auth: `const BRAND = '#E11D48'`
- `StatusBar style="dark"` en fondos claros, `"light"` en fondos oscuros
- `primaryColor` por defecto es `#4F46E5` antes de cargar un negocio

---

## Configuración del negocio

El dueño puede configurar:
- Nombre del negocio y color de marca
- Logo
- Período de pago: `semanal`, `bisemanal`, o `quincenal`
- Día de inicio del período de pago y fecha ancla
- Días laborables de la semana
- Horas máximas por día (0 = sin límite)
- Salida automática y minutos para activarla
- Ventana de horario (semanas hacia adelante/atrás a mostrar)

---

## Tipos de datos principales

| Tipo | Campos clave |
|---|---|
| `User` | `userId`, `email`, `firstName`, `lastName`, `role`, `businessId`, `provider` |
| `Business` | `businessId`, `name`, `color`, `ownerId`, `payPeriodType`, `openDays` |
| `Employee` | `employeeId`, `businessId`, `userId`, `email`, `tempPassword` |
| `Shift` | `shiftId`, `businessId`, `title`, `startTime`, `endTime`, `breakDuration`, `employeeId` |
| `TimeLog` | `logId`, `clockIn`, `clockOut`, `breaks[]`, `status`, `totalMinutes` |
| `Availability` | `availabilityId`, `type`, `startDate`, `endDate`, `daysOfWeek` |
| `PTO` | `ptoId`, `date`, `hours`, `type` |

---

## Reglas clave del proyecto

- **Nunca** quitar `--no-verify-jwt` de los deploys — sin eso, Supabase rechaza todas las solicitudes antes de que la función corra
- **Nunca** usar `LinearGradient` directamente — siempre usar `AnimatedBackground`
- Las edge functions corren en **Deno**, no Node — usar imports de `https://esm.sh/`, no `npm:`
- **Nunca** añadir `persistSession: true` al cliente de Supabase — la persistencia de tokens se maneja manualmente con SecureStore
- Usar `getServiceClient()` para escrituras en la BD, `getUserClient(authHeader)` para validar usuarios dentro de las edge functions

---

## Desarrollo local

```bash
# Instalar dependencias
cd frontend && npm install

# Iniciar Expo
npx expo start

# Correr en simulador iOS
npx expo run:ios

# Correr en emulador Android
npx expo run:android
```