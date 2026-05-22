# Guía de Integración Landing + Sistema de Tickets

## Visión General

La landing page y el sistema de tickets comparten un mismo navegador/localStorage. El flujo es:

1. **Landing lee formularios activos** del localStorage (sc_formularios)
2. **Ciudadano completa formulario** en la landing
3. **Formulario se envía** al sistema de tickets (crea un nuevo ticket)
4. **Admin ve el ticket** en el panel de administración del sistema

---

## Datos Compartidos en localStorage

| Key | Estructura | Acceso |
|-----|-----------|--------|
| `sc_formularios` | `Formulario[]` | Lectura desde landing, escritura desde sistema |
| `sc_tickets` | `Ticket[]` | Lectura/escritura solo sistema (lectura desde landing para verificación) |

### Estructura de Formulario
```typescript
interface Formulario {
  id: string;
  programa: TipoPrograma;
  activo: boolean;
  descripcion: string;
  creadoEn: string;
  actualizadoEn: string;
}

type TipoPrograma = 'Microcréditos 2024' | 'Cosecha y Acarreo 2026' | 'Programa Aprender, Trabajar y Producir';
```

### Estructura de Ticket (para respuesta)
```typescript
interface CrearTicketDesdeFormularioResponse {
  ticketId: string;
  numero: number;
  estado: string;
  mensaje: string;
}
```

---

## Paso 1: Actualizar Programas.jsx en Landing

### Objetivo
Leer `sc_formularios` del localStorage y mostrar solo programas activos.

### Código
Reemplazar `src/components/Programas.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { CreditCard, Star, Sun, ArrowRight, Check } from 'lucide-react'
import SectionHeader from './ui/SectionHeader'
import Card from './ui/Card'

const iconMap = { CreditCard, Star, Sun }

// Mapeo entre nombres de programas y formularios
const programaMap = {
  'Programa de Créditos destinado a Bienes Capitales': 'Microcréditos 2024',
  'Programa Pequeños Emprendedores': 'Programa Aprender, Trabajar y Producir',
  'Semana del Olivo': 'Cosecha y Acarreo 2026',
}

export default function Programas() {
  const [programasActivos, setProgramasActivos] = useState({})
  const [formularios, setFormularios] = useState([])

  // Leer formularios activos del localStorage
  useEffect(() => {
    const leerFormulariosActivos = () => {
      const formulariosStr = localStorage.getItem('sc_formularios')
      const formularios = formulariosStr ? JSON.parse(formulariosStr) : []

      // Crear mapa de programas activos
      const activos = {}
      formularios.forEach(f => {
        if (f.activo) {
          activos[f.programa] = true
        }
      })

      setProgramasActivos(activos)
      setFormularios(formularios)
    }

    leerFormulariosActivos()

    // Escuchar cambios en localStorage desde otra pestaña/ventana
    window.addEventListener('storage', leerFormulariosActivos)
    return () => window.removeEventListener('storage', leerFormulariosActivos)
  }, [])

  // Datos locales de programas
  const programas = [
    {
      id: 1,
      icon: 'CreditCard',
      title: 'Programa de Créditos destinado a Bienes Capitales',
      description:
        'Financiamiento para la adquisición de maquinaria, equipos y bienes de capital que mejoren la productividad de PyMEs sanjuaninas.',
      formularioKey: 'Microcréditos 2024',
    },
    {
      id: 2,
      icon: 'Star',
      title: 'Programa Pequeños Emprendedores',
      description:
        'Apoyo técnico y financiero para emprendedores en etapa temprana que buscan formalizar y escalar sus proyectos productivos.',
      formularioKey: 'Programa Aprender, Trabajar y Producir',
    },
    {
      id: 3,
      icon: 'Sun',
      title: 'Semana del Olivo',
      description:
        'Evento anual que celebra y promueve la cadena olivícola de San Juan, impulsando la calidad y la identidad regional del sector.',
      formularioKey: 'Cosecha y Acarreo 2026',
    },
  ]

  return (
    <section id="programas" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Nuestros Programas"
          subtitle="Herramientas de apoyo diseñadas para potenciar el desarrollo productivo provincial."
          centered
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {programas.map(({ id, icon, title, description, formularioKey }) => {
            const Icon = iconMap[icon] || Star
            const estaActivo = programasActivos[formularioKey]

            return (
              <Card
                key={id}
                className={`flex flex-col p-8 hover:shadow-lg transition-shadow ${
                  estaActivo ? 'border-2 border-green-500' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Icon size={24} className="text-orange-600" />
                  </div>
                  {estaActivo && (
                    <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                      <Check size={16} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-600">Activo</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed flex-1">{description}</p>
                {estaActivo && (
                  <button
                    onClick={() => {
                      // Scroll a sección de formulario
                      const formularioSection = document.getElementById('formulario-' + formularioKey)
                      if (formularioSection) {
                        formularioSection.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className="mt-6 inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2
                               rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Solicitar <ArrowRight size={16} />
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

---

## Paso 2: Crear Componente de Formulario Dinámico

Crear nuevo archivo: `src/components/FormularioDinamico.jsx`

```jsx
import { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function FormularioDinamico({ formularioId, programa }) {
  const [formData, setFormData] = useState({
    nombreCiudadano: '',
    emailCiudadano: '',
    telefonoCiudadano: '',
    descripcion: '',
  })
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMensaje(null)

    try {
      // Validación básica
      if (!formData.nombreCiudadano || !formData.emailCiudadano) {
        throw new Error('Nombre y email son requeridos')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.emailCiudadano)) {
        throw new Error('Email inválido')
      }

      // Crear ticket en el sistema
      const respuesta = crearTicketDesdeFormulario({
        formularioId,
        nombreCiudadano: formData.nombreCiudadano,
        emailCiudadano: formData.emailCiudadano,
        telefonoCiudadano: formData.telefonoCiudadano,
        descripcion: formData.descripcion,
      })

      setMensaje({
        tipo: 'exito',
        titulo: 'Solicitud enviada exitosamente',
        numero: respuesta.numero,
        mensaje: respuesta.mensaje,
      })

      // Limpiar formulario
      setFormData({
        nombreCiudadano: '',
        emailCiudadano: '',
        telefonoCiudadano: '',
        descripcion: '',
      })
    } catch (err) {
      setError(err.message || 'Error al enviar el formulario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">Solicitar {programa}</h3>

      {mensaje && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-green-900">{mensaje.titulo}</h4>
            <p className="text-green-700 text-sm mt-1">
              Su número de seguimiento es: <span className="font-mono font-bold">{mensaje.numero}</span>
            </p>
            <p className="text-green-600 text-sm mt-2">{mensaje.mensaje}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input
            type="text"
            name="nombreCiudadano"
            value={formData.nombreCiudadano}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Juan Pérez García"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            name="emailCiudadano"
            value={formData.emailCiudadano}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="juan@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            name="telefonoCiudadano"
            value={formData.telefonoCiudadano}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="264 4123456"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detalles de la Solicitud
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Cuéntenos sobre su proyecto o necesidad..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-lg
                   hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar Solicitud'}
      </button>
    </form>
  )
}

// Función para crear ticket desde landing
function crearTicketDesdeFormulario(data) {
  const ticketsStr = localStorage.getItem('sc_tickets') || '[]'
  const tickets = JSON.parse(ticketsStr)

  const nuevoTicket = {
    id: 'uuid-' + Date.now(),
    numero: (tickets.length || 0) + 1,
    titulo: `Solicitud: ${data.formularioId}`,
    descripcion: data.descripcion,
    estado: 'abierto',
    prioridad: 'media',
    formularioId: data.formularioId,
    ciudadanoNombre: data.nombreCiudadano,
    ciudadanoEmail: data.emailCiudadano,
    ciudadanoTelefono: data.telefonoCiudadano,
    creadoEn: new Date().toISOString(),
    comentarios: [],
  }

  tickets.push(nuevoTicket)
  localStorage.setItem('sc_tickets', JSON.stringify(tickets))

  return {
    ticketId: nuevoTicket.id,
    numero: nuevoTicket.numero,
    estado: nuevoTicket.estado,
    mensaje: `Ticket creado exitosamente. Su número de seguimiento es: ${nuevoTicket.numero}`,
  }
}
```

---

## Paso 3: Integrar Formulario en Landing App.jsx

Actualizar el componente principal para mostrar formularios cuando estén activos:

```jsx
// En App.jsx, agregar en la lista de secciones:

import FormularioDinamico from './components/FormularioDinamico'

// Dentro del layout, después de Programas:
<section id="solicitar" className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Mostrar formularios activos */}
    {/* Este código irá en el App.jsx existente */}
  </div>
</section>
```

---

## Paso 4: Sincronización en Tiempo Real

### Agregar Listener en Programas.jsx (ya incluido arriba)

El código incluye un listener para el evento `storage`, que permite detectar cambios en localStorage desde otras ventanas/pestañas:

```javascript
window.addEventListener('storage', leerFormulariosActivos)
```

Esto significa que si el admin abre un formulario en el sistema mientras el usuario está en la landing, verá el cambio en tiempo real.

---

## Paso 5: Datos Iniciales (Seed)

El sistema crea datos de ejemplo automáticamente. Para la landing, puede usar estos comando en la consola del navegador para agregar formularios de prueba:

```javascript
// En consola del navegador (cualquier pestaña)
localStorage.setItem('sc_formularios', JSON.stringify([
  {
    id: 'form-1',
    programa: 'Microcréditos 2024',
    activo: true,
    descripcion: 'Solicite financiamiento para bienes capitales',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: 'form-2',
    programa: 'Programa Aprender, Trabajar y Producir',
    activo: true,
    descripcion: 'Apoyo para emprendedores',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: 'form-3',
    programa: 'Cosecha y Acarreo 2026',
    activo: false,
    descripcion: 'Programa de acarreo',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  }
]))
```

---

## Flujo Completo: Ciudadano

1. Ciudadano abre landing page
2. Ve sección "Programas" con 3 opciones
3. Solo ve aquellos marcados como "Activo" en el sistema
4. Hace clic en "Solicitar"
5. Completa formulario con nombre, email, teléfono y detalles
6. Envía formulario
7. Sistema crea un ticket automáticamente
8. Ciudadano recibe número de seguimiento
9. Admin ve el nuevo ticket en el panel de administración del sistema

---

## Flujo Completo: Admin

1. Admin abre panel de administración
2. Va a pestaña "Formularios"
3. Activa/desactiva programas según necesidad
4. Cambios se guardan en localStorage
5. Landing page detecta el cambio automáticamente
6. Ciudadanos ven programas actualizados sin necesidad de refrescar
7. Admin ve nuevos tickets en pestaña "Usuarios" conforme los ciudadanos envíen solicitudes

---

## Notas Técnicas

### Persistencia
- `sc_formularios` es escribible solo desde el sistema (panel admin)
- `sc_tickets` es escribible desde landing (formularios) y sistema (admin)
- Ambos están en el mismo localStorage del navegador

### Validación
- Landing solo valida formato de email (no contacto a servidor)
- Sistema (backend futuro) hará validaciones adicionales

### Escalabilidad
Cuando el gobierno proporcione servidor:
1. Sistema apuntará a API en lugar de localStorage
2. Landing apuntará a mismo API para leer formularios activos
3. Cambio mínimo en código (solo variables de entorno)

---

## Troubleshooting

### Los formularios no aparecen en la landing
- Verificar que localStorage tenga clave `sc_formularios`
- Revisar console.log en browser developer tools
- Verificar que formularios tengan `activo: true`

### Tickets no se crean
- Verificar que localStorage tenga clave `sc_tickets`
- Revisar errores en console
- Validar formato de email

### Cambios no se sincronizan
- Usar misma instancia de navegador (no incógnito separada)
- Verificar que evento `storage` sea soportado (lo es en todos los navegadores modernos)
