# REGLAS DE DESARROLLO — CONTEXTO Psicología

Sistema: **CONTEXTO Psicología - Centro de Ciencias Comportamentales**

Estas reglas son de cumplimiento obligatorio para todo el desarrollo del proyecto.

## 1. Identidad y marca

- Nombre del sistema: **CONTEXTO Psicología**
- Subtítulo: **Centro de Ciencias Comportamentales**
- Desarrollado por: **Frank Medina**
- Todo texto visible para el usuario debe estar en **español**.
- La marca debe sentirse como un producto SaaS moderno y premium.

## 2. Stack tecnológico

- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions + Cron).
- **Frontend**: HTML5 puro, CSS3 puro, JavaScript moderno (ES modules).
- **Comunicación**: Fetch API / AJAX. No recargar toda la página; cargar por secciones.
- **TypeScript**: solo si es estrictamente necesario para Supabase.
- **NO frameworks frontend**: NO React, NO Vue, NO Angular.
- **NO CSS frameworks**: NO Bootstrap, NO Tailwind, NO jQuery.
- **NO librerías innecesarias**.

## 3. Arquitectura

- Modular: separar `components`, `services`, `utils`, `validation`, `config`, `pages`, `core`, `pwa`.
- Reutilizar componentes; no duplicar código.
- No improvisar arquitectura.
- No crear funcionalidades ficticias ni módulos no solicitados.

## 4. Nomenclatura

- **URLs y rutas internas**: en inglés (`/dashboard`, `/patients`, `/appointments`, `/sessions`, `/settings`).
- **Nombres de funciones**: en inglés (`openModal()`, `closeModal()`, `loadPatients()`, `validateForm()`).
- **Variables**: nombres claros y descriptivos (`patientData`, `currentUser`, `appointmentData`). Evitar `x`, `temp`, `data1`.
- **Comentarios de código**: en español.

```javascript
// Valida los campos obligatorios antes de enviar el formulario.
function validateForm() {
}
```

## 5. Idioma de interfaz

Toda la interfaz visible debe estar en español: botones, formularios, mensajes, errores, validaciones, modales, alertas, toast, estados, loading, skeleton, textos de ayuda, confirmaciones.comentarios de funciones 

Ejemplo correcto: "Paciente registrado correctamente."
Incorrecto: "Patient created successfully."

El código interno puede usar inglés.

## 6. Componentes reutilizables

Crear desde la base componentes generales consumidos por todos los módulos:
Modal, Toast, Alert, Confirm, Loading, Spinner, Skeleton, Empty state, Error state, Form validation, Input validation, Select, Search, Pagination, Dropdown, Tabs, Button, Card, Badge, Tooltip, File uploader, Image preview.

Ubicación central: `js/components/`. No duplicar en cada módulo.

## 7. Modales

- Tamaño medio por defecto; gigante solo si es realmente necesario.
- Incluir overlay, encabezado, contenido, acciones, botón cerrar, cierre seguro, responsive, accesibilidad básica, bloqueo de scroll del documento.
- Funciones: `openModal()`, `closeModal()`, `confirmModal()`.

## 8. Toast

- Sistema global con tipos: `success`, `error`, `warning`, `info`.
- Mensajes en español.
- Función: `showToast()`.

## 9. Alertas y confirmaciones

- No usar `alert()` ni `confirm()` nativos salvo razón técnica excepcional.
- Confirmaciones para operaciones destructivas (`¿Deseas eliminar este paciente?`).

## 10. Loading y skeleton

- Toda operación AJAX contempla: loading, success, empty, error.
- Skeleton para listas, cards y tablas; empty state; error state.
- Nunca dejar la interfaz congelada.

## 11. Validaciones

- Sistema centralizado en `js/utils/validators.js` y `js/utils/sanitizer.js`.
- Reutilizables: `validateRequired()`, `validateEmail()`, `validatePhone()`, `validatePassword()`, `validateDate()`, `validateFile()`, `sanitizeInput()`, `escapeHtml()`.
- La validación frontend NO reemplaza la backend. Nunca confiar en datos del navegador.

## 12. Seguridad

- Supabase Auth, Row Level Security (RLS) en todas las tablas.
- Roles y permisos: `admin`, `psychologist`, `assistant`, `patient` (RBAC).
- Principio de mínimo privilegio.
- No exponer `service_role_key`; usar solo anon key pública en frontend.
- Sanitización, escape de salida, control de sesión, logout seguro.
- No mostrar errores internos (SQL, stack traces, rutas, credenciales) al usuario.
- Datos clínicos separados y protegidos; no exponer información sensible en URLs ni localStorage.
- Logs de auditoría sin información sensible.

## 13. Dark / Light mode

- Variables CSS centralizadas en `css/themes/`.
- Usuario puede cambiar tema; preferencia persistida; respetar preferencia del sistema.

## 14. Responsive

- Funciona en escritorio, laptop, tablet, móvil (Android, iPhone).
- Debe sentirse como aplicación, no página web.
- Adaptar realmente la interfaz, no solo reducir tamaños.

## 15. Diseño

- Profesional, moderno, limpio, relacionado con bienestar y psicología.
- Accesible, responsive, mobile-first.
- No usar diseños genéricos de dashboard copiados; todo personalizado.

## 16. PWA

- `manifest.json`, service worker, iconos, instalación, caché controlada.
- No almacenar en caché información sensible de pacientes.

## 17. Producción

- HTTPS, variables de entorno, deploy en hosting estático o VPS.
- No credenciales hardcodeadas (salvo anon key pública).
- Sin `console.log()` innecesarios ni comentarios obsoletos.

## 18. Regla fundamental

- NO avanzar al siguiente módulo sin instrucción explícita.
- Terminar arquitectura, estructura, componentes, seguridad, errores, validaciones, modal, toast, alert, loading, skeleton, dark/light, responsive, API client, configuración para producción antes de implementar funcionalidad nueva.
- No inventar que algo funciona si no fue probado.




Composición Visual del Dashboard (Desktop)
┌─────────────────────────────────────────────────────┐
│ Header limpio: Logo | Reloj+Fecha | Notif|Cal|Tema │
├─────────────────────────────────────────────────────┤
│ "Buen día, Dra. Valeria"                           │
│ "Cada pequeño progreso cuenta."                    │
│                                                     │
│ ┌──────────┐              ┌──────────────────────┐  │
│ │ Resumen  │              │    ○ Pacientes ○     │  │
│ │ del día  │   ○ Citas ○  │   /              \   │  │
│ │ 04 Citas │  /   🧠    \ │  ○ CEREBRO ○    ○   │  │
│ │ 01 Eval  │ |  CONTEXTO  ||  Evaluaciones       │  │
│ │ 02 Tareas|  \         / │   \              /   │  │
│ │          │   ○ Eval  ○  │    ○ Tareas ○        │  │
│ └──────────┘              └──────────────────────┘  │
│                                                     │
│ ┌───────────────┐   ┌──────────────┐               │
│ │ Próximas Citas│   │ Estado       │               │
│ │ 10:00 Mariana │   │ Consultorio  │               │
│ │ 11:30 Andrés  │   │ ████░░ 78%   │               │
│ └───────────────┘   └──────────────┘               │
│                                                     │
│ "Cada proceso tiene su propio ritmo."              │
└─────────────────────────────────────────────────────┘
Paneles contextuales aparecen flotantes al hacer clic en nodos, con posiciones predefinidas por nodo.

Responsive Strategy
- Desktop (>1024px): Composición orbital completa, paneles flotantes
- Tablet (768-1024px): Órbitas reducidas, nodos más compactos, paneles se reorganizan
- Mobile (<768px): Núcleo arriba compacto, nodos en grid 2 columnas, paneles como bottom sheets

Secuencia de Implementación
1. CSS dashboard + variables — Base visual
2. dashboardService — Capa de datos mock
3. contextPanel — Sistema de paneles flotantes
4. orbitalCore — Núcleo central visual
5. orbitalNodes — Nodos interactivos
6. dashboard.js — Reescritura del page module
7. index.html + app.js — Integración
8. Responsive + reduced-motion — Adaptaciones
9. Pruebas — Desktop/tablet/mobile/dark/light/keyboard/accessibility
Preguntas antes de implementar
1. Iconos SVG: El sistema actual usa emoji en el sidebar (👤, 📅, etc.) pero las reglas dicen "NO utilizar iconos emoji" y "usar sistema de iconos definido por el proyecto". El proyecto actualmente NO tiene un sistema de iconos SVG definido — solo tiene los iconos PWA en assets/icons/. ¿Debo crear iconos SVG inline para cada nodo, o prefieres un enfoque específico?
2. Imagen iu.png: No puedo visualizarla. Si contiene una referencia visual del dashboard que deseas, ¿podrías describirme los elementos clave que debo replicar?
3. Header del dashboard: El dashboard debe ocultar el sidebar y usar un header diferente al resto de páginas, o el sidebar se mantiene y el dashboard se renderiza dentro del content wrapper actual?
4. Posición de los paneles contextuales: Las posiciones que propongo (Pacientes=abajo-izq, Evaluaciones=abajo-der, etc.) — ¿confirmas estas posiciones o prefieres otras?
5. Nodos adicionales: El plan inicial menciona 7 nodos. ¿Confirmas esta cantidad y esta distribución?




Recomendación para Dashboard loading (según pediste):
Para el dashboard, en lugar de un spinner, usar skeleton screens con animación de "shimmer" — rectángulos grises con linear-gradient animado que simulan el layout real (cards, estadísticas, tablas). El proyecto ya tiene js/components/skeleton.js importado en app.js:10. La diferencia: el auth page usa un spinner en el botón (acción única), pero el dashboard necesita skeleton screens porque carga múltiples secciones de datos simultáneamente.