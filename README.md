# Alianza 58 Bienes Raíces C.A.

Sitio web de bienes raíces para compra, venta y arrendamiento de inmuebles en Barinas, Venezuela. Casas, apartamentos, terrenos y locales comerciales.

## 🚀 URL en producción

- **Sitio:** https://alianza58.pages.dev
- **Login admin:** https://alianza58.pages.dev/login.html
- **Panel admin:** https://alianza58.pages.dev/admin.html

## 🔐 Credenciales admin

- **Email:** `admin@alianza58.com`
- **Contraseña:** `Alnza58_S3gur0_2026!`

## 🗄️ Base de datos D1

- **Database:** `propiedadesbarinas_db` (ID: `0e5d1802-5521-4771-ae0d-cf66878335c6`)
- **Binding:** `DB`

### Tablas
- `users` — usuarios (admin y clientes)
- `properties` — propiedades
- `property_images` — imágenes de propiedades
- `states` — estados de Venezuela
- `contacts` — mensajes de contacto
- `favorites` — favoritos de usuarios
- `settings` / `site_settings` — configuración del sitio
- `banner` — banner principal

## 📂 Estructura

```
alianza58/
├── index.html              # Home
├── login.html              # Login admin
├── admin.html              # Panel admin
├── propiedades.html        # Listado de propiedades
├── propiedad/[slug]        # Detalle de propiedad (function)
├── contacto.html           # Contacto
├── nosotros.html           # About
├── servicios.html          # Servicios
├── privacidad.html         # Política de privacidad
├── terminos.html           # Términos
├── plantilla-propiedad.html # Plantilla
├── css/styles.css          # Estilos (74KB)
├── js/
│   ├── app.js              # App principal (63KB)
│   ├── properties-list-enhancer.js
│   ├── property-enhancer.js
│   └── compress-video.js
├── images/                 # Imágenes del sitio
├── functions/              # Cloudflare Pages Functions
│   ├── _lib/auth.js        # JWT helpers
│   └── api/
│       ├── auth/           # login, logout, me, register
│       ├── admin/properties/
│       ├── properties/
│       ├── property-images/
│       ├── users/
│       ├── contacts/
│       ├── favorites/
│       ├── dashboard/
│       ├── stats/
│       ├── states/
│       ├── settings/
│       ├── site-settings/
│       ├── banner/
│       ├── upload/
│       └── serve/
├── _headers                # Cloudflare Pages headers
├── _routes.json            # Cloudflare Pages routes
├── wrangler.toml           # Config Cloudflare (D1 + R2)
└── robots.txt
```

## 🔧 Stack

- **Frontend:** HTML estático + CSS + Vanilla JS
- **Backend:** Cloudflare Pages Functions
- **DB:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (`alianza58-media`)
- **Auth:** JWT (HMAC-SHA256)
- **Mapas:** Leaflet + OpenStreetMap

## ⚙️ Variables de entorno

Configuradas en Cloudflare Pages → Settings → Environment variables:
- `JWT_SECRET` — secreto para firmar JWT

## 📊 Endpoints API

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Usuario actual |
| `/api/auth/register` | POST | Registro |
| `/api/properties` | GET | Listar propiedades |
| `/api/properties/:id` | GET | Detalle de propiedad |
| `/api/admin/properties` | GET | Admin: listar propiedades |
| `/api/states` | GET | Estados de Venezuela |
| `/api/contacts` | POST | Enviar contacto |
| `/api/dashboard` | GET | Stats del dashboard |
| `/api/upload` | POST | Subir imágenes (R2) |

## 🛠️ Comandos

```bash
# Deploy
npx wrangler pages deploy . --project-name=alianza58 --branch=main --commit-dirty=true

# Ver DB
npx wrangler d1 execute propiedadesbarinas_db --remote --command="SELECT * FROM users"

# Ver propiedades
npx wrangler d1 execute propiedadesbarinas_db --remote --command="SELECT id, title, price FROM properties"
```

---

**Alianza 58 Bienes Raíces C.A. · Barinas, Venezuela**
