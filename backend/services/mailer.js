const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarInvitacion({ nombre, email, token, modulo, rol }) {
  const sistemaUrl = process.env.SISTEMA_URL || 'https://sistema.agenciacalidadsanjuan.com.ar';
  const link = `${sistemaUrl}/?activar=${token}`;

  const sistemaLabel = modulo === 'savean' ? 'SAVEAN — Guías de Origen Fitosanitario' : 'Sistema de Tickets';
  const rolLabel =
    modulo === 'savean'
      ? rol === 'admin' ? 'Director / Agencia' : 'Inspector Barrerista'
      : rol === 'admin' ? 'Administrador' : 'Colaborador';

  await transporter.sendMail({
    from: `"Agencia de Calidad San Juan" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Bienvenido/a al Sistema de Gestión — Agencia de Calidad San Juan',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:#7F1D1D;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;">Agencia de Calidad San Juan</h1>
                  <p style="color:#fca5a5;margin:8px 0 0;font-size:14px;">Ministerio de Producción</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="color:#374151;font-size:16px;margin:0 0 16px;">Hola <strong>${nombre}</strong>,</p>
                  <p style="color:#374151;font-size:15px;margin:0 0 24px;">
                    Fuiste invitado/a a acceder al <strong>${sistemaLabel}</strong> con el rol de <strong>${rolLabel}</strong>.
                  </p>
                  <p style="color:#374151;font-size:15px;margin:0 0 8px;">
                    Para activar tu cuenta y crear tu contraseña, hacé clic en el siguiente botón:
                  </p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="${link}" style="background:#FF9500;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">
                      Activar mi cuenta
                    </a>
                  </div>
                  <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">
                    O copiá este link en tu navegador:
                  </p>
                  <p style="color:#3b82f6;font-size:13px;word-break:break-all;margin:0 0 24px;">
                    <a href="${link}" style="color:#3b82f6;">${link}</a>
                  </p>
                  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;">
                    <p style="color:#92400e;font-size:13px;margin:0;">
                      ⚠️ Este link es válido por <strong>48 horas</strong>. Si no lo usás en ese plazo, pedile al administrador que te reenvíe la invitación.
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">
                    © ${new Date().getFullYear()} Agencia de Calidad San Juan · Si no solicitaste este acceso, ignorá este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}

module.exports = { enviarInvitacion };
