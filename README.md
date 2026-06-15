# TerapiaOS 🧠

**Sistema SaaS de Gestión Clínica para Terapia Ocupacional Infantil**

Plataforma integral con IA, portal para padres, integración con WhatsApp Business y soporte PWA.

---

## 🚀 Características principales

- **Expediente digital** completo con historia clínica, evaluaciones y seguimiento
- **Agenda interactiva** semanal con gestión de citas y recordatorios automáticos
- **Motor de evaluaciones** con 6 áreas clínicas y gráficas radar/barras
- **Planes terapéuticos** con objetivos, indicadores y seguimiento de progreso
- **Registro de sesiones** con dictado por voz (Web Speech API)
- **Asistente IA** (Claude Sonnet) para reportes, análisis y planes de actividades
- **Mensajería WhatsApp Business** con plantillas y confirmación de citas
- **Portal de padres** con acceso restringido a citas, reportes y chat
- **Facturación** con control de cobros, pagos y reportes financieros
- **Reportes ejecutivos** con gráficas y exportación PDF
- **PWA** con soporte offline, instalable en móvil y desktop
- **Multitenancy** vía RLS de PostgreSQL (múltiples clínicas en una sola instancia)

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| IA | Anthropic Claude API (claude-sonnet-4-6) |
| Mensajería | WhatsApp Business API (Meta) |
| Gráficas | Recharts |
| Calendario | Custom (grid de horas) |
| PWA | Service Worker, Web App Manifest |
| Monorepo | Turborepo |

---

## 📁 Estructura del proyecto

```
terapia-saas/
├── apps/
│   └── web/                    # App principal (staff + portal padres en /portal)
├── packages/
│   ├── db/                     # Tipos de DB y cliente Supabase
│   └── ui/                     # Componentes compartidos
└── supabase/
    └── migrations/
        └── 001_schema_completo.sql  # Schema completo de BD
```

---

## ⚙️ Configuración inicial

### 1. Requisitos previos

- Node.js 18+
- npm o pnpm
- Cuenta en [Supabase](https://supabase.com)
- API Key de [Anthropic](https://console.anthropic.com)

### 2. Instalar dependencias

```bash
cd terapia-saas
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example apps/web/.env.local
# Edita apps/web/.env.local con tus credenciales
```

### 4. Configurar Supabase

1. Crea un nuevo proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta las migraciones en orden:

```bash
# supabase/migrations/001_schema_completo.sql
# supabase/migrations/002_portal_padres.sql
# supabase/migrations/003_storage_archivos.sql
# supabase/migrations/004_rls_staff_clinico.sql
```

O automáticamente (requiere `SUPABASE_DB_URL` en `.env.local`):

```bash
node --env-file=apps/web/.env.local apps/web/scripts/apply-pending-migrations.mjs
```

3. En **Authentication → Settings**:
   - Habilita "Email Auth"
   - Configura el dominio de redirección (e.g., `http://localhost:3000`)

4. En **Storage**, crea un bucket llamado `terapia-os-files` (o ejecuta `003_storage_archivos.sql`, que lo crea automáticamente)

> **Portal padres:** usa `apps/web` en `/portal/*`. La carpeta `apps/portal-padres` está obsoleta (ver `DEPRECATED.md`).

### 5. Crear usuario administrador

En Supabase SQL Editor:

```sql
-- 1. Primero crea el usuario desde Auth → Users → Invite
-- 2. Luego registra la clínica y el usuario:

INSERT INTO clinicas (nombre, email, plan)
VALUES ('Mi Clínica de TO', 'admin@miclinica.com', 'profesional')
RETURNING id;

-- Usa el ID generado arriba y el UUID del usuario de Auth:
INSERT INTO usuarios (id, clinica_id, nombre, apellidos, email, rol)
VALUES (
  'UUID-DEL-USUARIO-EN-AUTH',
  'UUID-DE-LA-CLINICA',
  'Admin',
  'Principal',
  'admin@miclinica.com',
  'admin_general'
);
```

### 6. Ejecutar en desarrollo

```bash
# Desde la raíz del monorepo:
npm run dev

# O solo la app web:
cd apps/web && npm run dev
```

La app estará disponible en `http://localhost:3000`

---

## 🔗 Integración con WhatsApp Business

1. Crea una app en [Meta for Developers](https://developers.facebook.com)
2. Agrega el producto **WhatsApp Business**
3. Obtén el `Phone Number ID` y un `Access Token` permanente
4. Configura el webhook:
   - URL: `https://tu-dominio.com/api/whatsapp/webhook`
   - Token de verificación: el mismo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Suscríbete a: `messages`, `message_status`
5. Ingresa las credenciales en **Configuración → WhatsApp** dentro de la app

---

## 🤖 Configuración de IA

La IA usa [Claude Sonnet 4.6](https://www.anthropic.com/claude) de Anthropic.

1. Obtén tu API key en [console.anthropic.com](https://console.anthropic.com)
2. Agrégala a `.env.local` como `ANTHROPIC_API_KEY`
3. Cada generación consume entre 1,000–3,000 tokens (~$0.01-0.03 USD)

---

## ⏰ Configurar recordatorios automáticos (Cron)

El endpoint `/api/citas/recordatorio` envía WhatsApps automáticos.

**Con Vercel Cron:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/citas/recordatorio",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Con Railway o cualquier servidor:**
```bash
# Crontab (cada día a las 8am):
0 8 * * * curl -X POST https://tu-dominio.com/api/citas/recordatorio \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

---

## 📱 PWA — Instalar en móvil

La app es instalable como PWA en iOS y Android:

1. Abre la app en el navegador del dispositivo
2. En iOS: Safari → Compartir → Agregar a pantalla de inicio
3. En Android: Chrome → Menú → Instalar app

---

## 🔒 Seguridad y cumplimiento

- **RLS de PostgreSQL**: cada clínica solo accede a sus propios datos
- **Cifrado en tránsito**: TLS 1.3 en todas las comunicaciones
- **Autenticación**: Supabase Auth con JWT (expiración configurable)
- **Auditoría**: tabla `auditoria` registra todas las acciones críticas
- **Cumplimiento**: diseñado bajo criterios de NOM-024-SSA3-2010 (México)
- **HIPAA-ready**: almacenamiento cifrado, acceso por roles, logs de acceso

---

## 🚀 Deploy en producción

### Vercel (recomendado)

```bash
# Instala Vercel CLI
npm i -g vercel

# Deploy desde apps/web
cd apps/web
vercel --prod
```

Configura las variables de entorno en el dashboard de Vercel.

### Docker

```bash
# Desde la raíz del monorepo
docker build -t terapia-os -f apps/web/Dockerfile .
docker run -p 3000:3000 --env-file apps/web/.env.local terapia-os
```

---

## 📊 Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| `/dashboard` | KPIs, gráficas semanales, citas del día, insights IA |
| `/pacientes` | CRUD pacientes con expediente completo |
| `/agenda` | Calendario semanal con gestión de citas |
| `/sesiones` | Registro de sesiones con dictado por voz |
| `/evaluaciones` | Motor de evaluaciones con gráficas radar |
| `/planes` | Planes terapéuticos con objetivos y progreso |
| `/ia` | Asistente IA con 5 modos de análisis |
| `/facturacion` | Control de cobros y reportes financieros |
| `/mensajes` | WhatsApp Business + chat portal padres |
| `/reportes` | Reportes ejecutivos con exportación PDF |
| `/configuracion` | Clínica, sucursales, usuarios, WhatsApp |

---

## 🧪 Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin_general` | Acceso total, configuración, reportes financieros |
| `director_clinico` | Todos los módulos clínicos + reportes |
| `terapeuta` | Sus propios pacientes, sesiones, evaluaciones, IA |
| `recepcion` | Agenda, pacientes, facturación, mensajes |
| `padre` | Portal de padres (citas, reportes, chat) |

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: descripción del cambio'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📄 Licencia

MIT — Uso libre para proyectos comerciales y personales.

---

**TerapiaOS** — Construido con ❤️ para terapeutas ocupacionales que marcan la diferencia en la vida de niños y familias.
