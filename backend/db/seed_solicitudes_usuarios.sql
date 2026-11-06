-- =============================================================================
-- Seed Solicitudes v1
--   Habilita puede_solicitar = 1 para los 15 inspectores autorizados
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/seed_solicitudes_usuarios.sql
-- =============================================================================

USE agencia_calidad;

UPDATE usuarios SET puede_solicitar = 1
WHERE modulo = 'savean'
  AND (
    (nombre LIKE '%Castro%'    AND nombre LIKE '%Horacio%')
 OR (nombre LIKE '%Flores%'    AND nombre LIKE '%Carlos%')
 OR (nombre LIKE '%Mancini%'   AND nombre LIKE '%Daniel%')
 OR (nombre LIKE '%Quiroga%'   AND nombre LIKE '%Javier%')
 OR (nombre LIKE '%Chirino%'   AND nombre LIKE '%Emiliano%')
 OR (nombre LIKE '%omez%'      AND nombre LIKE '%Nelson%')
 OR (nombre LIKE '%Gonzalez%'  AND nombre LIKE '%Nancy%')
 OR (nombre LIKE '%alazar%'    AND nombre LIKE '%rica%')
 OR (nombre LIKE '%Ferron%'    AND nombre LIKE '%Gabriel%')
 OR (nombre LIKE '%Garay%'     AND nombre LIKE '%Cristian%')
 OR (nombre LIKE '%Gonzalez%'  AND nombre LIKE '%Ricardo%')
 OR (nombre LIKE '%Zavalla%'   AND nombre LIKE '%Alexis%')
 OR (nombre LIKE '%Castillo%'  AND nombre LIKE '%Cintia%')
 OR (nombre LIKE '%Casta%'     AND nombre LIKE '%Ariel%')
 OR (nombre LIKE '%Rosselot%'  AND nombre LIKE '%Diego%')
  );

SELECT nombre, puede_solicitar FROM usuarios
WHERE modulo = 'savean' AND puede_solicitar = 1
ORDER BY nombre;
