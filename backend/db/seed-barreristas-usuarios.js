require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

const barreristas = [
  { nombre: 'Alejandro Aballay',             usuario: 'aaballay' },
  { nombre: 'Aldo Abrego',                   usuario: 'aabrego' },
  { nombre: 'Claudio Agüero',               usuario: 'caguero' },
  { nombre: 'Santiago Aguirre',             usuario: 'saguirre' },
  { nombre: 'José Mercedes Aguirre',        usuario: 'jaguirre' },
  { nombre: 'Cristian Baigorria',           usuario: 'cbaigorria' },
  { nombre: 'Walter Balmaceda',             usuario: 'wbalmaceda' },
  { nombre: 'Leonardo Casanelli',           usuario: 'lcasanelli' },
  { nombre: 'Ariel Castaño',               usuario: 'acastano' },
  { nombre: 'Lourdes Castillo',            usuario: 'lcastillo' },
  { nombre: 'Cintia Castillo',             usuario: 'ccastillo' },
  { nombre: 'Julia Castillo',              usuario: 'jcastillo' },
  { nombre: 'Horacio Castro',              usuario: 'hcastro' },
  { nombre: 'Emiliano Chirino',            usuario: 'echirino' },
  { nombre: 'Claudia Fernandez',           usuario: 'cfernandez' },
  { nombre: 'Gabriel Ferron',              usuario: 'gferron' },
  { nombre: 'Carlos Flores',              usuario: 'cflores' },
  { nombre: 'Cristian Garay',             usuario: 'cgaray' },
  { nombre: 'Oscar Garay',               usuario: 'ogaray' },
  { nombre: 'Sergio Antonio Geraldo',     usuario: 'sgeraldo' },
  { nombre: 'Renzo Godoy',               usuario: 'rgodoy' },
  { nombre: 'Nelson Gomez',              usuario: 'ngomez' },
  { nombre: 'Luis Angel Gonzalez',       usuario: 'lgonzalez' },
  { nombre: 'Nancy Gonzalez',            usuario: 'ngonzalez' },
  { nombre: 'Ricardo Gonzalez',          usuario: 'rgonzalez' },
  { nombre: 'Cristian Guzman',           usuario: 'cguzman' },
  { nombre: 'Claudia Herrera',           usuario: 'cherrera' },
  { nombre: 'Jessica Illanes',           usuario: 'jillanes' },
  { nombre: 'Sabrina Lazo',             usuario: 'slazo' },
  { nombre: 'Daniel Mancini',            usuario: 'dmancini' },
  { nombre: 'Roberto Morales',           usuario: 'rmorales' },
  { nombre: 'Diego Moreno',             usuario: 'dmoreno' },
  { nombre: 'Sergio Navarrete',          usuario: 'snavarrete' },
  { nombre: 'Mauricio Raúl Nome',        usuario: 'mnome' },
  { nombre: 'Braian Orozco',            usuario: 'borozco' },
  { nombre: 'Tadeo Ortiz',              usuario: 'tortiz' },
  { nombre: 'Fernando Peleitay',         usuario: 'fpeleitay' },
  { nombre: 'Mario Peletier',           usuario: 'mpeletier' },
  { nombre: 'María de los Ángeles Pereyra', usuario: 'mpereyra' },
  { nombre: 'Orlando Pereyra',          usuario: 'opereyra' },
  { nombre: 'Javier Quiroga',           usuario: 'jquiroga' },
  { nombre: 'Carlos Quiroga',           usuario: 'cquiroga' },
  { nombre: 'Marcelo Recabarren',       usuario: 'mrecabarren' },
  { nombre: 'Aníbal Rivero',            usuario: 'arivero' },
  { nombre: 'Luis Rodriguez',           usuario: 'lrodriguez' },
  { nombre: 'Diego Rosselot',           usuario: 'drosselot' },
  { nombre: 'Milagros Sabio',           usuario: 'msabio' },
  { nombre: 'Hugo Sanchez',             usuario: 'hsanchez' },
  { nombre: 'Carlos Suesa',             usuario: 'csuesa' },
  { nombre: 'Gustavo Talquenca',        usuario: 'gtalquenca' },
  { nombre: 'Eduardo Tanten',           usuario: 'etanten' },
  { nombre: 'Daniel Tejada',            usuario: 'dtejada' },
  { nombre: 'Oscar Tobares',            usuario: 'otobares' },
  { nombre: 'Daniel Alfredo Tula',      usuario: 'dtula' },
  { nombre: 'Antonio Vega',            usuario: 'avega' },
  { nombre: 'Erica Zalazar',           usuario: 'ezalazar' },
  { nombre: 'Franco Mariano Zalazar',  usuario: 'fzalazar' },
  { nombre: 'Juan Zapata',             usuario: 'jzapata' },
  { nombre: 'Alexis Zavalla Gomez',    usuario: 'azavalla' },
];

async function seedBarreristasUsuarios() {
  console.log('Creando cuentas de usuario para barreristas SAVEAN...\n');

  let creados = 0;
  let yaExisten = 0;

  for (const b of barreristas) {
    const email = `${b.usuario}@savean.gob.ar`;

    const [existing] = await pool.query(
      'SELECT usuarioId FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log(`  [EXISTE]  ${email}`);
      yaExisten++;
      continue;
    }

    const hash = await bcrypt.hash(b.usuario, 10);
    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo)
       VALUES (?, ?, ?, ?, 'contribuidor', 'savean', 1)`,
      [uuidv4(), b.nombre, email, hash]
    );

    console.log(`  [CREADO]  ${b.nombre.padEnd(35)} → ${email}  /  ${b.usuario}`);
    creados++;
  }

  console.log(`\n✓ Listo. Creados: ${creados}  |  Ya existían: ${yaExisten}`);
  console.log('\nCredenciales de acceso:');
  console.log('  URL:        https://sistema.agenciacalidadsanjuan.com.ar');
  console.log('  Email:      {usuario}@savean.gob.ar   (ej: aaballay@savean.gob.ar)');
  console.log('  Contraseña: igual al usuario           (ej: aaballay)\n');

  await pool.end();
}

seedBarreristasUsuarios().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
