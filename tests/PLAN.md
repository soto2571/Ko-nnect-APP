# Plan de Pruebas — Ko-nnecta'

## Como correr las pruebas

```bash
cd tests
npx tsx run.ts           # Correr TODAS las pruebas
npx tsx run.ts auth      # Solo pruebas de autenticacion
npx tsx run.ts employees # Solo pruebas de empleados
npx tsx run.ts timeclock # Solo pruebas de reloj
npx tsx run.ts payroll   # Simulacion de 2 semanas
```

## Estructura

```
tests/
  PLAN.md          ← Este archivo
  config.ts        ← URLs, keys, credenciales de prueba
  helpers.ts       ← Funciones compartidas (login, fetch, assertions, cleanup)
  run.ts           ← Ejecutor de pruebas
  01-auth.test.ts
  02-business.test.ts
  03-employees.test.ts
  04-shifts.test.ts
  05-timeclock.test.ts
  06-payroll-simulation.test.ts
```

---

## 01 — Autenticacion (auth)

### Crear Cuenta (signup)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 1  | Crear cuenta con datos validos | 201, retorna user + token | Positivo |
| 2  | Crear cuenta sin nombre | Error "Faltan campos requeridos" | Negativo |
| 3  | Crear cuenta sin apellido | Error "Faltan campos requeridos" | Negativo |
| 4  | Crear cuenta sin email | Error "Faltan campos requeridos" | Negativo |
| 5  | Crear cuenta sin password | Error "Faltan campos requeridos" | Negativo |
| 6  | Crear cuenta con email duplicado | Error "Ya existe una cuenta" (409) | Negativo |
| 7  | Crear cuenta con password de 3 caracteres | Error del servidor (Supabase rechaza < 6) | Negativo |
| 8  | Crear cuenta con email invalido (sin @) | Error del servidor | Negativo |

### Login Dueno (auth-login)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 9  | Login con credenciales correctas | 200, retorna user + token + businessId | Positivo |
| 10 | Login con password incorrecta | Error "Credenciales incorrectas" (401) | Negativo |
| 11 | Login con email que no existe | Error "Credenciales incorrectas" (401) | Negativo |
| 12 | Login sin email | Error "Ingresa tu correo y contraseña" | Negativo |
| 13 | Login sin password | Error "Ingresa tu correo y contraseña" | Negativo |
| 14 | Login con body vacio | Error | Negativo |
| 15 | Token del login es valido para hacer API calls | Llamar auth-profile con el token debe funcionar | Positivo |

### Login Empleado
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 16 | Login con credenciales auto-generadas | 200, role = employee | Positivo |
| 17 | Login con password incorrecta | Error 401 | Negativo |

### Check Provider (auth-check-provider)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 18 | Email de cuenta email/password | provider = "email" | Positivo |
| 19 | Email que no existe | provider = null | Positivo |
| 20 | Sin email en body | Error "Missing email" | Negativo |

---

## 02 — Negocio (business)

### Crear Negocio (business-create)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 21 | Crear negocio con nombre y color | 201, retorna business con businessId | Positivo |
| 22 | Crear negocio sin nombre | Error "Missing business name" | Negativo |
| 23 | Crear negocio sin autenticacion | Error 401 | Negativo |
| 24 | Crear negocio con caracteres especiales "Lee's Café & Bar" | Se crea correctamente, nombre se guarda tal cual | Positivo |

### Obtener Negocio (business-get)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 25 | Obtener negocio existente | 200, retorna datos completos | Positivo |
| 26 | Obtener negocio con ID invalido | Error o data vacia | Negativo |

### Actualizar Negocio (business-update)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 27 | Actualizar nombre del negocio | 200, nombre actualizado | Positivo |
| 28 | Actualizar color del negocio | 200, color actualizado | Positivo |
| 29 | Actualizar payPeriodType a biweekly | 200, tipo actualizado | Positivo |
| 30 | Actualizar sin autenticacion | Error 401 | Negativo |

---

## 03 — Empleados (employees)

### Agregar Empleado (employees-add)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 31 | Agregar empleado con nombre y apellido | 201, retorna employee + credentials | Positivo |
| 32 | Verificar email generado: "Juan Perez" + "Mi Tienda" = juan.perez@mitienda.app | Email correcto | Positivo |
| 33 | Agregar empleado con negocio con caracteres especiales "Lee's Café" | Email = juan.perez@leescaf.app (sanitizado) | Positivo |
| 34 | Agregar 2 empleados con mismo nombre → sufijo numerico | Segundo email = juan.perez2@... | Positivo |
| 35 | Agregar empleado sin nombre | Error "Faltan campos" | Negativo |
| 36 | Agregar empleado sin autenticacion | Error 401 | Negativo |
| 37 | Verificar que se puede hacer login con las credenciales generadas | Login exitoso con email y tempPassword | Positivo |

### Listar Empleados (employees-list)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 38 | Listar empleados del negocio | Array con los empleados creados | Positivo |
| 39 | Listar sin businessId | Error | Negativo |

### Actualizar Empleado (employees-update)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 40 | Cambiar nombre del empleado | 200, nombre actualizado | Positivo |

### Eliminar Empleado (employees-delete)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 41 | Eliminar empleado | 200, ya no aparece en la lista | Positivo |
| 42 | Eliminar empleado que no existe | Error 404 o similar | Negativo |

---

## 04 — Turnos (shifts)

### Crear Turno (shifts-create)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 43 | Crear turno con titulo, hora inicio y fin | 201, retorna shift | Positivo |
| 44 | Crear turno con break de 30 min | 201, breakDuration = 30 | Positivo |
| 45 | Crear turno sin titulo | Error "Missing required fields" | Negativo |
| 46 | Crear turno sin businessId | Error | Negativo |

### Asignar Turno (shifts-assign)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 47 | Asignar turno a empleado | 200, status = assigned, employeeId correcto | Positivo |
| 48 | Desasignar turno (employeeId = null) | 200, status = open | Positivo |

### Obtener Turnos (shifts-get)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 49 | Obtener turnos del negocio | Array con turnos creados | Positivo |

### Eliminar Turno (shifts-delete)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 50 | Eliminar turno | 200, ya no aparece en lista | Positivo |

---

## 05 — Reloj / Timeclock

### Clock In (timelog-clock-in)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 51 | Clock in a turno asignado | 201, status = clocked_in, clockIn tiene timestamp | Positivo |
| 52 | Clock in duplicado al mismo turno | Error "Already clocked in" (400) | Negativo |
| 53 | Clock in sin shiftId | Error "Missing shiftId or businessId" | Negativo |
| 54 | Clock in sin autenticacion | Error 401 | Negativo |

### Break Start (timelog-break-start)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 55 | Empezar break cuando esta clocked in | 200, status = on_break, breaks tiene 1 entry | Positivo |
| 56 | Empezar break cuando no esta clocked in | Error "Not clocked in" | Negativo |
| 57 | Empezar break cuando ya esta on break | Error "Not clocked in" (status es on_break) | Negativo |

### Break End (timelog-break-end)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 58 | Terminar break cuando esta on_break | 200, status = clocked_in, break tiene end | Positivo |
| 59 | Terminar break cuando no esta on_break | Error "Not on break" | Negativo |

### Clock Out (timelog-clock-out)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 60 | Clock out normal (sin break) | 200, status = clocked_out, totalMinutes calculado | Positivo |
| 61 | Clock out con break completado | 200, totalMinutes descuenta break | Positivo |
| 62 | Clock out despues de 9+ horas → overtime | 200, overtimeDay = true | Positivo |
| 63 | Clock out sin haber tomado break programado | 200, status = missed_punch | Positivo |
| 64 | Clock out cuando ya esta clocked_out | Error "Already clocked out" | Negativo |

### Multiples Breaks
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 65 | Tomar 2 breaks, verificar array de breaks | breaks.length = 2, ambos con start y end | Positivo |
| 66 | Verificar que totalMinutes descuenta ambos breaks | Calculo correcto | Positivo |

### Listar Timelogs (timelog-list)
| #  | Caso | Esperado | Tipo |
|----|------|----------|------|
| 67 | Listar timelogs por rango de fechas | Retorna solo los del rango | Positivo |
| 68 | Listar timelogs filtrando por employeeId | Retorna solo los del empleado | Positivo |

---

## 06 — Simulacion de 2 Semanas (payroll)

**OBJETIVO:** Simular 14 dias de trabajo para 2 empleados con diferentes patrones y verificar que los datos son correctos para generar payroll.

### Setup
- Crear negocio con periodo bisemanal, semana empieza lunes
- Crear 2 empleados: "Maria Garcia" y "Carlos Lopez"
- Crear turnos de 8am-5pm (lunes a viernes) y 8am-1pm (sabados) para ambos

### Dias Simulados (Lunes Dia 1 → Domingo Dia 14)

**Maria Garcia — Empleada modelo:**
| Dia | Horario | Break | Horas Netas | Notas |
|-----|---------|-------|-------------|-------|
| L1  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| M2  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| X3  | 8:00-17:00 | 12:00-12:45 (45m) | 8.25h | Break largo |
| J4  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| V5  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| S6  | 8:00-13:00 | (ninguno) | 5h | Medio dia |
| D7  | — | — | 0 | Libre |
| L8  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| M9  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| X10 | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| J11 | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| V12 | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| S13 | 8:00-13:00 | (ninguno) | 5h | Medio dia |
| D14 | — | — | 0 | Libre |
| **TOTAL** | | | **96.75h** | |

**Carlos Lopez — Empleado irregular:**
| Dia | Horario | Break | Horas Netas | Notas |
|-----|---------|-------|-------------|-------|
| L1  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| M2  | 8:15-17:30 | (olvido marcar break) | 9.25h | Missed break, OVERTIME |
| X3  | 8:00-17:00 | 11:30-12:00, 15:00-15:15 (2 breaks) | 8.25h | Doble break |
| J4  | — | — | 0 | No se presento |
| V5  | 8:00-19:00 | 12:00-12:30 (30m) | 10.5h | OVERTIME (>8h neto) |
| S6  | 8:00-13:00 | (ninguno) | 5h | Normal |
| D7  | — | — | 0 | Libre |
| L8  | 7:45-16:00 | 12:00-12:30 (30m) | 7.75h | Llego temprano |
| M9  | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| X10 | 8:00-12:00 | (ninguno) | 4h | Medio dia inesperado |
| J11 | 8:00-17:00 | 12:00-12:30 (30m) | 8.5h | Normal |
| V12 | 8:00-17:00 | 12:00-13:00 (60m) | 8h | Break de 1 hora |
| S13 | — | — | 0 | No vino |
| D14 | — | — | 0 | Libre |
| **TOTAL** | | | **70.25h** | |

### Verificaciones del Payroll
| #  | Verificacion | Esperado |
|----|-------------|----------|
| 69 | Total horas Maria en 2 semanas | 96.75h (5805 min) |
| 70 | Total horas Carlos en 2 semanas | 70.25h (4215 min) |
| 71 | Dias con overtime Carlos | 2 dias (M2 y V5) |
| 72 | Dias con missed_punch Carlos | 1 dia (M2) |
| 73 | Dias trabajados Maria | 12 de 14 |
| 74 | Dias trabajados Carlos | 10 de 14 |
| 75 | Break total Maria semana 1 | 165 min (2h 45m) |
| 76 | Break total Carlos semana 1 | 75 min (1h 15m) |
| 77 | Timelogs filtrados por empleado funcionan | Solo muestra del empleado pedido |
| 78 | Timelogs filtrados por rango de fecha | Solo muestra del rango pedido |
| 79 | Semana 1 vs Semana 2 separadas correctamente | Datos por semana cuadran |
| 80 | Calculo totalMinutes en cada timelog es correcto | Compara calculado vs guardado |

---

## Resultado Esperado

Al final de las pruebas se imprime:
```
====================================
  RESULTADOS — Ko-nnecta' Tests
====================================
  01 Auth:       14/15 passed (1 failed)
  02 Business:    8/8  passed
  03 Employees:  10/10 passed
  04 Shifts:      6/6  passed
  05 Timeclock:  14/14 passed
  06 Payroll:    12/12 passed
------------------------------------
  TOTAL:         64/65 passed
  FAILED:        1
====================================
```

Con detalle de cada prueba fallida, que se esperaba, y que se obtuvo.
