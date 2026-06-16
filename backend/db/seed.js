require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function seedUsuario({ email, password, nombre, rol, modulo }) {
  const [existing] = await pool.query('SELECT usuarioId FROM usuarios WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log(`Usuario ya existe: ${email}, verificando modulo...`);
    await pool.query('UPDATE usuarios SET modulo = ? WHERE email = ?', [modulo, email]);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [uuidv4(), nombre, email, hash, rol, modulo]
  );
  console.log(`Usuario creado: ${email}`);
}

async function seed() {
  console.log('Starting seed...');

  // ── Usuarios ────────────────────────────────────────────────────────────────
  await seedUsuario({
    email: 'admin@agenciacalidad.gob.ar',
    password: 'admin123',
    nombre: 'Administrador',
    rol: 'admin',
    modulo: 'tickets',
  });

  await seedUsuario({
    email: 'inspector@savean.gob.ar',
    password: 'savean123',
    nombre: 'Inspector Savean',
    rol: 'contribuidor',
    modulo: 'savean',
  });

  await seedUsuario({
    email: 'director@savean.gob.ar',
    password: 'director123',
    nombre: 'Director Savean',
    rol: 'admin',
    modulo: 'savean',
  });

  // ── Barreras SAVEAN ─────────────────────────────────────────────────────────
  const barreras = [
    { nombre: 'San Carlos',  ruta: 'Ruta Nac. 40',   kilometro: 'km 3379', departamento: 'Sarmiento' },
    { nombre: 'Valle Fértil', ruta: 'Ruta Prov. 510', kilometro: '',        departamento: 'Valle Fértil' },
    { nombre: 'Talacasto',   ruta: 'Ruta Nac. 40',   kilometro: 'km 3550', departamento: 'Albardón' },
    { nombre: 'Caucete',     ruta: 'Ruta Nac. 20',   kilometro: '',        departamento: 'Caucete' },
    { nombre: 'Zonda',       ruta: 'Ruta Prov. 12',  kilometro: '',        departamento: 'Zonda' },
    { nombre: 'Albardón',    ruta: 'Ruta Nac. 40',   kilometro: 'km 3580', departamento: 'Albardón' },
    { nombre: 'Iglesia',     ruta: 'Ruta Nac. 150',  kilometro: '',        departamento: 'Iglesia' },
    { nombre: '25 de Mayo',  ruta: 'Ruta Nac. 7',    kilometro: '',        departamento: '25 de Mayo' },
  ];

  const [existingBarreras] = await pool.query('SELECT COUNT(*) AS total FROM barreras_savean');
  if (Number(existingBarreras[0].total) === 0) {
    for (const b of barreras) {
      await pool.query(
        'INSERT INTO barreras_savean (barreraId, nombre, ruta, kilometro, departamento, activa) VALUES (?, ?, ?, ?, ?, 1)',
        [uuidv4(), b.nombre, b.ruta || null, b.kilometro || null, b.departamento || null]
      );
    }
    console.log(`Barreras SAVEAN creadas: ${barreras.length}`);
  } else {
    console.log('Barreras SAVEAN ya existen, saltando.');
  }

  // ── Barreristas SAVEAN ───────────────────────────────────────────────────────
  const barreristas = [
    { nombre: 'Alejandro Aballay',          usuario: 'aaballay' },
    { nombre: 'Aldo Abrego',                usuario: 'aabrego' },
    { nombre: 'Claudio Agüero',             usuario: 'caguero' },
    { nombre: 'Santiago Aguirre',           usuario: 'saguirre' },
    { nombre: 'José Mercedes Aguirre',      usuario: 'jaguirre' },
    { nombre: 'Cristian Baigorria',         usuario: 'cbaigorria' },
    { nombre: 'Walter Balmaceda',           usuario: 'wbalmaceda' },
    { nombre: 'Leonardo Casanelli',         usuario: 'lcasanelli' },
    { nombre: 'Ariel Castaño',              usuario: 'acastano' },
    { nombre: 'Lourdes Castillo',           usuario: 'lcastillo' },
    { nombre: 'Cintia Castillo',            usuario: 'ccastillo' },
    { nombre: 'Julia Castillo',             usuario: 'jcastillo' },
    { nombre: 'Horacio Castro',             usuario: 'hcastro' },
    { nombre: 'Emiliano Chirino',           usuario: 'echirino' },
    { nombre: 'Claudia Fernandez',          usuario: 'cfernandez' },
    { nombre: 'Gabriel Ferron',             usuario: 'gferron' },
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

  const [existingBarreristas] = await pool.query('SELECT COUNT(*) AS total FROM barreristas_savean');
  if (Number(existingBarreristas[0].total) === 0) {
    for (const b of barreristas) {
      await pool.query(
        'INSERT INTO barreristas_savean (barreristId, nombre, usuario, activo) VALUES (?, ?, ?, 1)',
        [uuidv4(), b.nombre, b.usuario]
      );
    }
    console.log(`Barreristas SAVEAN creados: ${barreristas.length}`);
  } else {
    console.log('Barreristas SAVEAN ya existen, saltando.');
  }

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
