# Documentación API - Sistema de Gestión de Tickets
## Agencia Calidad San Juan

---

## 1. Introducción

Este documento describe la estructura y especificación de la API REST que el backend debe implementar para soportar el sistema frontend de gestión de tickets de la Agencia Calidad San Juan.

**Base URL:** `http://[servidor]:[puerto]/api`

**Autenticación:** JWT (Bearer Token)

---

## 2. Estructuras de Datos

### 2.1 Usuario
```json
{
  "usuarioId": "uuid-string",
  "nombre": "Juan Pérez",
  "email": "juan@agenciacalidad.gob.ar",
  "rol": "admin|contribuidor",
  "activo": true,
  "creadoEn": "2026-05-20T10:30:00Z",
  "actualizadoEn": "2026-05-20T10:30:00Z"
}
```

### 2.2 Ticket
```json
{
  "ticketId": "uuid-string",
  "titulo": "Problema con formulario",
  "descripcion": "El formulario de microcréditos no carga",
  "estado": "abierto|en_progreso|cerrado",
  "prioridad": "baja|media|alta|critica",
  "asignadoA": "uuid-usuario",
  "formularioId": "uuid-formulario",
  "ciudadanoEmail": "ciudadano@example.com",
  "fechaCreacion": "2026-05-20T10:30:00Z",
  "fechaCierre": null,
  "comentarios": [
    {
      "id": "uuid",
      "autor": "uuid-usuario",
      "contenido": "Se está investigando",
      "fecha": "2026-05-20T11:00:00Z"
    }
  ]
}
```

### 2.3 Formulario
```json
{
  "formularioId": "uuid-string",
  "programa": "Microcréditos 2024|Cosecha y Acarreo 2026|Programa Aprender, Trabajar y Producir",
  "activo": true,
  "descripcion": "Formulario para solicitar microcréditos",
  "creadoEn": "2026-05-20T10:30:00Z",
  "actualizadoEn": "2026-05-20T10:30:00Z"
}
```

### 2.4 Sesión (Response Login)
```json
{
  "token": "eyJhbGc...",
  "usuario": {
    "usuarioId": "uuid",
    "nombre": "Juan Pérez",
    "email": "juan@agenciacalidad.gob.ar",
    "rol": "admin|contribuidor"
  },
  "expiresIn": 3600
}
```

---

## 3. Endpoints

### 3.1 Autenticación

#### 3.1.1 Login
**POST** `/auth/login`

**Request:**
```json
{
  "email": "juan@agenciacalidad.gob.ar",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "email": "juan@agenciacalidad.gob.ar",
    "rol": "admin"
  },
  "expiresIn": 3600
}
```

**Errores:**
- `401`: Email o contraseña incorrectos
- `404`: Usuario no existe

---

### 3.2 Usuarios

#### 3.2.1 Obtener todos los usuarios
**GET** `/usuarios`

**Headers:**
```
Authorization: Bearer [token]
```

**Response (200):**
```json
{
  "usuarios": [
    {
      "usuarioId": "uuid",
      "nombre": "Juan Pérez",
      "email": "juan@agenciacalidad.gob.ar",
      "rol": "admin",
      "activo": true,
      "creadoEn": "2026-05-20T10:30:00Z",
      "actualizadoEn": "2026-05-20T10:30:00Z"
    }
  ],
  "total": 5
}
```

**Permisos:** Solo admin

---

#### 3.2.2 Crear usuario
**POST** `/usuarios`

**Headers:**
```
Authorization: Bearer [token]
Content-Type: application/json
```

**Request:**
```json
{
  "nombre": "María García",
  "email": "maria@agenciacalidad.gob.ar",
  "password": "password123",
  "rol": "contribuidor"
}
```

**Response (201):**
```json
{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440001",
  "nombre": "María García",
  "email": "maria@agenciacalidad.gob.ar",
  "rol": "contribuidor",
  "activo": true,
  "creadoEn": "2026-05-20T10:30:00Z",
  "actualizadoEn": "2026-05-20T10:30:00Z"
}
```

**Errores:**
- `400`: Email ya existe o datos inválidos
- `401`: No autorizado (no es admin)

**Permisos:** Solo admin

---

#### 3.2.3 Actualizar estado de usuario (activo/inactivo)
**PATCH** `/usuarios/{usuarioId}/toggle-activo`

**Headers:**
```
Authorization: Bearer [token]
```

**Response (200):**
```json
{
  "usuarioId": "uuid",
  "activo": false
}
```

**Errores:**
- `401`: No autorizado
- `403`: No puede desactivar a sí mismo
- `404`: Usuario no existe

**Permisos:** Solo admin

---

#### 3.2.4 Eliminar usuario
**DELETE** `/usuarios/{usuarioId}`

**Headers:**
```
Authorization: Bearer [token]
```

**Response (204):** Sin contenido

**Errores:**
- `401`: No autorizado
- `403`: No puede eliminarse a sí mismo
- `404`: Usuario no existe

**Permisos:** Solo admin

---

### 3.3 Tickets

#### 3.3.1 Obtener todos los tickets
**GET** `/tickets?estado=abierto&formularioId=uuid`

**Headers:**
```
Authorization: Bearer [token]
```

**Query Parameters (opcionales):**
- `estado`: abierto, en_progreso, cerrado
- `formularioId`: filtrar por formulario
- `asignadoA`: filtrar por usuario asignado
- `skip`: paginación (default: 0)
- `limit`: paginación (default: 20)

**Response (200):**
```json
{
  "tickets": [
    {
      "ticketId": "uuid",
      "titulo": "Problema con formulario",
      "descripcion": "El formulario no carga",
      "estado": "abierto",
      "prioridad": "alta",
      "asignadoA": "uuid-usuario",
      "formularioId": "uuid-formulario",
      "ciudadanoEmail": "ciudadano@example.com",
      "fechaCreacion": "2026-05-20T10:30:00Z",
      "fechaCierre": null
    }
  ],
  "total": 15,
  "skip": 0,
  "limit": 20
}
```

---

#### 3.3.2 Crear ticket (desde formulario ciudadano)
**POST** `/tickets/crear-desde-formulario`

**Request (sin autenticación):**
```json
{
  "formularioId": "uuid-formulario",
  "nombreCiudadano": "Carlos López",
  "emailCiudadano": "carlos@example.com",
  "telefonoCiudadano": "2644123456",
  "descripcion": "Necesito ayuda con mi solicitud de microcrédito",
  "datosAdicionales": {}
}
```

**Response (201):**
```json
{
  "ticketId": "uuid-nuevo",
  "estado": "abierto",
  "numero": 12345,
  "mensaje": "Ticket creado exitosamente. Su número de seguimiento es: 12345"
}
```

**Errores:**
- `400`: Datos inválidos
- `404`: Formulario no existe o no está activo

---

#### 3.3.3 Actualizar estado de ticket
**PATCH** `/tickets/{ticketId}`

**Headers:**
```
Authorization: Bearer [token]
```

**Request:**
```json
{
  "estado": "en_progreso",
  "prioridad": "alta",
  "asignadoA": "uuid-usuario"
}
```

**Response (200):**
```json
{
  "ticketId": "uuid",
  "estado": "en_progreso",
  "prioridad": "alta",
  "asignadoA": "uuid-usuario",
  "actualizadoEn": "2026-05-20T11:00:00Z"
}
```

**Permisos:** Admin y contribuidor asignado

---

#### 3.3.4 Agregar comentario a ticket
**POST** `/tickets/{ticketId}/comentarios`

**Headers:**
```
Authorization: Bearer [token]
```

**Request:**
```json
{
  "contenido": "Se está investigando el problema"
}
```

**Response (201):**
```json
{
  "comentarioId": "uuid",
  "ticketId": "uuid",
  "autorId": "uuid-usuario",
  "contenido": "Se está investigando el problema",
  "fecha": "2026-05-20T11:30:00Z"
}
```

---

### 3.4 Formularios

#### 3.4.1 Obtener todos los formularios
**GET** `/formularios`

**Headers:**
```
Authorization: Bearer [token]
```

**Response (200):**
```json
{
  "formularios": [
    {
      "formularioId": "uuid1",
      "programa": "Microcréditos 2024",
      "descripcion": "Solicitud de microcrédito",
      "activo": true,
      "creadoEn": "2026-05-20T10:30:00Z",
      "actualizadoEn": "2026-05-20T10:30:00Z"
    },
    {
      "formularioId": "uuid2",
      "programa": "Cosecha y Acarreo 2026",
      "descripcion": "Solicitud para programa de cosecha",
      "activo": true,
      "creadoEn": "2026-05-20T10:30:00Z",
      "actualizadoEn": "2026-05-20T10:30:00Z"
    }
  ]
}
```

---

#### 3.4.2 Obtener formularios activos (para landing)
**GET** `/formularios/publicos/activos`

**Response (200 - Sin autenticación):**
```json
{
  "formularios": [
    {
      "formularioId": "uuid1",
      "programa": "Microcréditos 2024",
      "descripcion": "Solicitud de microcrédito"
    }
  ]
}
```

---

#### 3.4.3 Activar/Desactivar formulario
**PATCH** `/formularios/{formularioId}/toggle-activo`

**Headers:**
```
Authorization: Bearer [token]
```

**Response (200):**
```json
{
  "formularioId": "uuid",
  "activo": true,
  "actualizadoEn": "2026-05-20T11:00:00Z"
}
```

**Permisos:** Solo admin

---

## 4. Códigos de Error Comunes

| Código | Significado |
|--------|------------|
| `200` | OK - Solicitud exitosa |
| `201` | Created - Recurso creado |
| `204` | No Content - Eliminado exitosamente |
| `400` | Bad Request - Datos inválidos |
| `401` | Unauthorized - Autenticación requerida |
| `403` | Forbidden - Sin permisos |
| `404` | Not Found - Recurso no existe |
| `409` | Conflict - Email ya existe |
| `500` | Internal Server Error - Error del servidor |

---

## 5. Autenticación

### JWT Token
Todos los endpoints (excepto login y crear ticket desde formulario) requieren:

```
Authorization: Bearer <token>
```

El token incluirá:
```json
{
  "usuarioId": "uuid",
  "email": "user@example.com",
  "rol": "admin|contribuidor",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## 6. Validaciones Requeridas

### Usuario
- Email: formato válido, máximo 255 caracteres
- Nombre: mínimo 2 caracteres, máximo 100
- Password: mínimo 6 caracteres (en el backend, hashear con bcrypt)
- Rol: solo "admin" o "contribuidor"

### Ticket
- Título: mínimo 5 caracteres, máximo 200
- Descripción: máximo 5000 caracteres
- Estado: solo valores válidos (abierto, en_progreso, cerrado)
- Email ciudadano: formato válido

### Formulario
- Programa: debe ser uno de los 3 programas válidos
- Descripción: máximo 500 caracteres

---

## 7. Notas Importantes

1. **CORS**: El backend debe permitir requests desde el dominio del frontend
2. **HTTPS**: Usar HTTPS en producción
3. **Rate Limiting**: Considerar limitar requests por IP
4. **Logging**: Registrar todas las operaciones sensibles
5. **Base de Datos**: Considerar índices en campos como email, usuarioId, ticketId

---

## 8. Ejemplo Flujo Completo

### Admin crea usuario y formulario
1. `POST /auth/login` - Admin se autentica
2. `POST /usuarios` - Crea nuevo contribuidor
3. `GET /formularios` - Ve formularios existentes
4. `PATCH /formularios/{id}/toggle-activo` - Activa formulario

### Ciudadano completa formulario y se crea ticket
1. `GET /formularios/publicos/activos` - Ve formularios activos en landing
2. `POST /tickets/crear-desde-formulario` - Completa formulario → crea ticket

### Contribuidor gestiona tickets
1. `POST /auth/login` - Se autentica
2. `GET /tickets` - Ve tickets asignados
3. `PATCH /tickets/{id}` - Actualiza estado
4. `POST /tickets/{id}/comentarios` - Agrega comentarios

---

**Versión:** 1.0
**Última actualización:** 20/05/2026
**Responsable:** Agencia Calidad San Juan
