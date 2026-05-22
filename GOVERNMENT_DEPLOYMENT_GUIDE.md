# Guía de Deployment - Servidor del Gobierno

## Información de Contexto

Este proyecto está diseñado para ser deployado en un servidor del gobierno con credenciales y configuración específicas. Esta guía cubre los pasos necesarios cuando reciba las credenciales del servidor.

---

## Requisitos Previos

Cuando el gobierno proporcione el servidor, obtendrá:
- **IP del servidor** o dominio (ej: `192.168.x.x` o `api.agenciacalidad.gob.ar`)
- **Puerto** (típicamente 80 para HTTP o 443 para HTTPS)
- **Credenciales SSH** (usuario/contraseña o llave privada)
- **Base de datos** (si está disponible) o instrucciones para configurarla

---

## Estructura del Proyecto

```
supportcandy/
├── src/
│   ├── components/       # Componentes React (UI)
│   ├── context/         # Context API (Auth, Formularios)
│   ├── services/        # Servicios (HTTP client, acceso a APIs)
│   ├── pages/           # Páginas principales
│   ├── App.tsx          # Componente raíz
│   └── main.tsx         # Punto de entrada
├── dist/                # Build de producción (generado)
├── .env                 # Variables de entorno (NO commitar)
├── .env.example         # Ejemplo de variables (para documentación)
├── vite.config.ts       # Configuración de Vite
├── package.json         # Dependencias y scripts
└── README.md            # Documentación
```

---

## Fase 1: Antes del Deployment

### 1. Preparar el Repositorio

```bash
# Asegurarse de que .env está en .gitignore
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore
git add .gitignore
git commit -m "chore: exclude .env files"

# Verificar que .env.example existe con variable VITE_API_URL
cat .env.example
```

### 2. Crear Variables de Entorno para Producción

Una vez tenga las credenciales del gobierno, crear archivo `.env` **localmente** (NO en git):

```env
# Reemplazar con IP/dominio real del servidor
VITE_API_URL=https://api.agenciacalidad.gob.ar/api

# En producción, usar API real (false) en lugar de localStorage
VITE_USE_LOCAL_STORAGE=false

# Timeout para requests HTTP (milisegundos)
VITE_REQUEST_TIMEOUT=30000

# Desactivar modo debug en producción
VITE_DEBUG=false
```

### 3. Build Local para Prueba

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Verificar que dist/ fue generado correctamente
ls -la dist/
```

---

## Fase 2: Configurar Servidor del Gobierno

### Opción A: Con Node.js + PM2 (Recomendado)

#### 1. Conectar al Servidor
```bash
ssh usuario@IP_DEL_SERVIDOR
# O si usa llave privada:
ssh -i /ruta/a/llave_privada.pem usuario@IP_DEL_SERVIDOR
```

#### 2. Instalar Dependencias en el Servidor
```bash
# Actualizar sistema operativo
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v18 o superior)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar npm (si no viene incluido)
sudo apt install -y npm

# Instalar PM2 para mantener la app ejecutándose
sudo npm install -g pm2
```

#### 3. Clonar Repositorio del Gobierno
```bash
# Navegar a ubicación de proyectos (ejemplo)
cd /var/www

# Clonar repositorio
git clone https://[repositorio_url] supportcandy
cd supportcandy

# Instalar dependencias del proyecto
npm install
```

#### 4. Crear .env en Servidor
```bash
# Crear archivo .env con variables específicas del servidor
nano .env

# Contenido:
# VITE_API_URL=https://api.agenciacalidad.gob.ar/api
# VITE_USE_LOCAL_STORAGE=false
# VITE_REQUEST_TIMEOUT=30000
# VITE_DEBUG=false

# Guardar: Ctrl+O, Enter, Ctrl+X
```

#### 5. Build en Servidor
```bash
npm run build

# Verificar que dist/ existe
ls -la dist/
```

#### 6. Iniciar con PM2
```bash
# Iniciar servidor (asume que hay script en package.json)
# Si no hay backend Node.js, usar servidor estático:
npm install -g serve

# Iniciar la aplicación
pm2 start "serve -s dist -l 3000" --name "supportcandy"

# Guardar configuración de PM2 para reiniciar automáticamente
pm2 startup
pm2 save
```

#### 7. Configurar Reverse Proxy (nginx)
```bash
# Instalar nginx
sudo apt install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/supportcandy
```

Contenido de `/etc/nginx/sites-available/supportcandy`:
```nginx
server {
    listen 80;
    server_name api.agenciacalidad.gob.ar;

    # Redirigir HTTP a HTTPS (opcional pero recomendado)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.agenciacalidad.gob.ar;

    # Certificados SSL (Let's Encrypt recomendado)
    ssl_certificate /etc/letsencrypt/live/api.agenciacalidad.gob.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.agenciacalidad.gob.ar/privkey.pem;

    # Frontend SPA (React app)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend (cuando esté disponible)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/supportcandy /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar nginx
sudo systemctl restart nginx
```

#### 8. Configurar SSL con Let's Encrypt (HTTPS)
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot certonly --nginx -d api.agenciacalidad.gob.ar

# Auto-renovación
sudo systemctl enable certbot.timer
```

---

### Opción B: Con Docker (Alternativo)

Si prefiere containerizar la aplicación:

#### 1. Crear Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Imagen final
FROM node:18-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

#### 2. Crear docker-compose.yml
```yaml
version: '3.8'

services:
  supportcandy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=${VITE_API_URL}
      - VITE_USE_LOCAL_STORAGE=${VITE_USE_LOCAL_STORAGE}
      - VITE_REQUEST_TIMEOUT=${VITE_REQUEST_TIMEOUT}
    restart: always
```

#### 3. Deploy
```bash
# En servidor
docker-compose up -d
```

---

## Fase 3: Actualizar Configuración de API

### En el Archivo `.env.example` o Documentación

Mantener actualizado con la URL real:

```env
# Producción (gobierno)
VITE_API_URL=https://api.agenciacalidad.gob.ar/api

# Desarrollo local
VITE_API_URL=http://localhost:3000/api
```

### En el Código (`src/services/http-client.ts`)

El cliente HTTP ya está preparado para leer de variables de entorno:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true'
```

No requiere cambios.

---

## Fase 4: Monitoreo y Mantenimiento

### Verificar Estado

```bash
# Ver logs de PM2
pm2 logs supportcandy

# Ver estado
pm2 status

# Ver detalles
pm2 show supportcandy
```

### Actualizar Código

```bash
# Actualizar repositorio
cd /var/www/supportcandy
git pull origin main

# Reinstalar dependencias si cambió package.json
npm install

# Rebuild
npm run build

# Reiniciar aplicación
pm2 restart supportcandy
```

### Backups

```bash
# Backup automático diario a las 2 AM
# Agregar a crontab:
crontab -e

# Contenido:
0 2 * * * tar -czf /backups/supportcandy-$(date +\%Y\%m\%d).tar.gz /var/www/supportcandy/dist
```

---

## Fase 5: Integración con Backend API

Cuando el gobierno proporcione el backend API, cambiar en `.env`:

```env
# Cambiar VITE_USE_LOCAL_STORAGE a false
VITE_USE_LOCAL_STORAGE=false

# Apuntar a API real
VITE_API_URL=https://api.agenciacalidad.gob.ar/api
```

El código ya maneja esto automáticamente. No requiere cambios en código JavaScript.

---

## Troubleshooting

### Problema: Aplicación no abre
```bash
# Revisar logs
pm2 logs supportcandy

# Revisar puerto
sudo netstat -tulpn | grep :3000

# Verificar nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Problema: Variables de entorno no se cargan
```bash
# Verificar que .env existe en servidor
ls -la /var/www/supportcandy/.env

# Verificar valores
cat /var/www/supportcandy/.env

# Nota: Variables de entorno se embeben en tiempo de build
# Si cambió .env, necesita hacer rebuild:
npm run build
pm2 restart supportcandy
```

### Problema: CORS errors
Configurar CORS en nginx:
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

### Problema: SSL no funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal
```

---

## Comandos Útiles Rápidos

```bash
# SSH al servidor
ssh usuario@IP

# Ver estado de aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs supportcandy

# Reiniciar aplicación
pm2 restart supportcandy

# Detener aplicación
pm2 stop supportcandy

# Iniciar aplicación
pm2 start supportcandy

# Ver versión de Node
node --version

# Ver versión de npm
npm --version

# Limpiar cache npm
npm cache clean --force

# Reinstalar dependencias (limpieza completa)
rm -rf node_modules package-lock.json
npm install
```

---

## Checklist Pre-Deployment

- [ ] Recibió credenciales del servidor del gobierno
- [ ] Probó build local (`npm run build`)
- [ ] Creó `.env` con `VITE_API_URL` correcto
- [ ] Clonó repositorio en servidor
- [ ] Instaló Node.js v18+
- [ ] Hizo `npm install` en servidor
- [ ] Hizo `npm run build` en servidor
- [ ] Configuró PM2 o Docker
- [ ] Configuró nginx/reverse proxy
- [ ] Configuró SSL con Let's Encrypt
- [ ] Verificó que aplicación abre en dominio
- [ ] Probó funcionalidad básica (login, crear ticket)
- [ ] Configuró backups automáticos
- [ ] Documentó proceso en wiki/README interno

---

## Soporte y Escalabilidad Futura

### Cuando Tenga Backend API Completo

1. Crear archivo `/api/server.js` con endpoints descritos en `API_DOCUMENTATION.md`
2. Cambiar `VITE_USE_LOCAL_STORAGE=false`
3. Backend maneja persistencia en BD real

### Cuando Tenga Base de Datos

Conectar en `/api/server.js`:
```javascript
// Ejemplo con MongoDB
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL)
```

### Para Escalabilidad Horizontal

Usar PM2 cluster mode:
```bash
pm2 start "serve -s dist" -i max --name "supportcandy"
```

---

## Documentación Relacionada

- `API_DOCUMENTATION.md` - Especificación de endpoints
- `LANDING_INTEGRATION_GUIDE.md` - Cómo conectar landing page
- `.env.example` - Variables de configuración
- `src/services/http-client.ts` - Cliente HTTP con soporte API

---

## Contacto y Preguntas

Cuando el gobierno proporcione servidor:
1. Proporcionar credenciales SSH
2. Confirmación de dominio/IP
3. Especificaciones de backend (si las tiene)
4. Requisitos de base de datos
5. SLA o disponibilidad requerida

Este documento se actualiza conforme se obtiene más información del servidor.
