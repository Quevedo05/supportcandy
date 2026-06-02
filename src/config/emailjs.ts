// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN EMAILJS
//
// Pasos para obtener estos valores:
//  1. Creá una cuenta gratuita en https://www.emailjs.com  (200 mails/mes gratis)
//  2. Add New Service → conectá el mail de la agencia (Outlook, Gmail, etc.)
//     Copiá el "Service ID" que te da → pegalo en SERVICE_ID abajo
//  3. Email Templates → Create New Template
//     En el template usá estas variables:
//       {{to_name}}          → nombre del destinatario
//       {{to_email}}         → email del destinatario
//       {{activation_link}}  → link de activación
//       {{sistema_label}}    → nombre del sistema asignado
//       {{rol_label}}        → rol asignado
//       {{etapas_label}}     → etapas asignadas (solo para tickets)
//     Copiá el "Template ID" → pegalo en TEMPLATE_ID abajo
//  4. Account → General → Public Key → pegalo en PUBLIC_KEY abajo
// ─────────────────────────────────────────────────────────────────────────────

export const EMAILJS_CONFIG = {
  serviceId: 'REEMPLAZAR_CON_SERVICE_ID',
  templateId: 'REEMPLAZAR_CON_TEMPLATE_ID',
  publicKey: 'REEMPLAZAR_CON_PUBLIC_KEY',
};

// Texto sugerido para el cuerpo del template en EmailJS:
//
// Asunto: Acceso al Sistema de Gestión — Agencia Calidad San Juan
//
// Cuerpo:
// Hola {{to_name}},
//
// Se ha creado tu acceso al Sistema de Gestión de la Agencia de Calidad San Juan.
//
// Para activar tu cuenta y crear tu contraseña, ingresá al siguiente enlace:
// {{activation_link}}
//
// Tu email de acceso es: {{to_email}}
// Sistema asignado: {{sistema_label}}
// Rol: {{rol_label}}
// {{etapas_label}}
//
// Si tenés algún problema, contactá al administrador.
//
// Agencia de Calidad San Juan
