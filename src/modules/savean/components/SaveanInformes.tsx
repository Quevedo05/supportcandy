import { useState, useMemo } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean } from '../types/savean';
import { Download, Filter, X } from 'lucide-react';

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Aliases: clave en MAYÚSCULAS → nombre canónico
const DESTINO_ALIASES: Record<string, string> = {
  'MZA': 'MENDOZA', 'MDZ': 'MENDOZA',
  'BSAS': 'BUENOS AIRES', 'BS AS': 'BUENOS AIRES', 'BS.AS.': 'BUENOS AIRES',
  'CABA': 'BUENOS AIRES', 'CAPITAL FEDERAL': 'BUENOS AIRES',
  'EEUU': 'ESTADOS UNIDOS', 'EE UU': 'ESTADOS UNIDOS',
  'EE.UU.': 'ESTADOS UNIDOS', 'USA': 'ESTADOS UNIDOS',
  'UNITED STATES': 'ESTADOS UNIDOS', 'UNITED STATES OF AMERICA': 'ESTADOS UNIDOS',
  'BRAZIL': 'BRASIL',
  'SUDAFRICA': 'SUDÁFRICA', 'SOUTH AFRICA': 'SUDÁFRICA',
  'RIO NEGRO': 'RÍO NEGRO', 'NEUQUEN': 'NEUQUÉN', 'CORDOBA': 'CÓRDOBA',
  'TUCUMAN': 'TUCUMÁN', 'ENTRE RIOS': 'ENTRE RÍOS',
};

function normalizarDestino(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return DESTINO_ALIASES[upper] ?? upper;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1_000)     return (n / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' K';
  return n.toLocaleString('es-AR');
}

function hoyISO() { return new Date().toISOString().slice(0, 10); }

function primerDiaMesISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function exportarCSV(guias: GuiaSavean[]) {
  const headers = [
    'Número', 'Estado', 'Fecha Emisión', 'Fecha Verificación',
    'Remitente', 'RENSPA', 'Destinatario', 'Tipo Destino', 'Destino (Prov/País)',
    'Especies', 'Total Bultos', 'Total Kg', 'Tipos de Envase',
    'Barrera', 'Inspector', 'Conductor', 'Patente Vehículo', 'Patente Acoplado',
    'Empresa Transporte', 'Precintos',
  ];

  const rows = guias.map(g => {
    const especies = [...new Set(g.items.map(i => i.especie).filter(Boolean))].join(' / ');
    const envases = [...new Set(g.items.map(i => i.tipoEnvase).filter(Boolean))].join(' / ');
    const totalBultos = g.items.reduce((s, i) => s + (i.cantidadBultos ?? 0), 0);
    const totalKg = g.items.reduce((s, i) => s + (i.cantidadKg ?? 0), 0);
    const destino = g.destinoTipo === 'externo'
      ? [g.destinoPais, g.destinoPuntoSalida].filter(Boolean).join(' / ')
      : [g.destinoProvincia, g.destinoMercadoInterno].filter(Boolean).join(' / ');
    return [
      g.numero, g.estado,
      g.fechaEmision.slice(0, 10),
      g.fechaVerificacion?.slice(0, 10) ?? '',
      g.remitenteNombre, g.remitenteRenspa ?? '',
      g.destinatarioNombre, g.destinoTipo, destino,
      especies, totalBultos || '', totalKg || '', envases,
      g.barrieraNombre ?? '', g.inspectorNombre ?? '',
      g.transporteConductor, g.transporteCamionPatente,
      g.transporteAcopladoPatente ?? '', g.transporteEmpresa ?? '', g.transportePrecintos ?? '',
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `informe-savean-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ESTADOS = ['pendiente', 'verificada', 'vencida', 'denegada'] as const;

const ESTADO_STYLE: Record<string, string> = {
  pendiente: 'bg-orange-100 text-orange-700 border-orange-300',
  verificada: 'bg-green-100 text-green-700 border-green-300',
  denegada: 'bg-red-100 text-red-700 border-red-300',
  vencida: 'bg-gray-100 text-gray-500 border-gray-300',
};

export function SaveanInformes() {
  const { guias, barreras } = useSavean();

  const [fechaDesde, setFechaDesde] = useState(primerDiaMesISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [estados, setEstados] = useState<string[]>([...ESTADOS]);
  const [barreraId, setBarreraId] = useState('');
  const [destinoTipo, setDestinoTipo] = useState('');
  const [especieFiltro, setEspecieFiltro] = useState('');
  const [textoBusqueda, setTextoBusqueda] = useState('');

  const especiesDisponibles = useMemo(() => {
    const set = new Set<string>();
    guias.forEach(g => g.items.forEach(i => { if (i.especie) set.add(i.especie); }));
    return [...set].sort();
  }, [guias]);

  const resultado = useMemo(() => {
    return guias.filter(g => {
      const fecha = g.fechaEmision.slice(0, 10);
      if (fecha < fechaDesde || fecha > fechaHasta) return false;
      if (!estados.includes(g.estado)) return false;
      if (barreraId && g.barreraId !== barreraId) return false;
      if (destinoTipo && g.destinoTipo !== destinoTipo) return false;
      if (especieFiltro && !g.items.some(i => i.especie === especieFiltro)) return false;
      if (textoBusqueda.trim()) {
        const q = textoBusqueda.trim().toLowerCase();
        const campos = [
          g.numero, g.remitenteNombre, g.destinatarioNombre,
          g.transporteConductor, g.transporteCamionPatente,
          g.destinoProvincia, g.destinoPais, g.barrieraNombre,
          g.inspectorNombre, g.transporteEmpresa,
        ];
        if (!campos.some(c => (c ?? '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [guias, fechaDesde, fechaHasta, estados, barreraId, destinoTipo, especieFiltro, textoBusqueda]);

  const stats = useMemo(() => {
    const byEstado: Record<string, number> = {};
    const byBarrera: Record<string, number> = {};
    const byEspecie: Record<string, number> = {};
    const byDestino: Record<string, number> = {};
    let totalBultos = 0;
    let totalKg = 0;

    for (const g of resultado) {
      byEstado[g.estado] = (byEstado[g.estado] ?? 0) + 1;

      if (g.barrieraNombre) {
        byBarrera[g.barrieraNombre] = (byBarrera[g.barrieraNombre] ?? 0) + 1;
      }

      const destRaw = g.destinoTipo === 'externo'
        ? (g.destinoPais ?? g.destinoPuntoSalida ?? 'Exterior')
        : (g.destinoProvincia ?? g.destinoMercadoInterno ?? 'Mercado Interno');
      const destKey = normalizarDestino(destRaw);
      byDestino[destKey] = (byDestino[destKey] ?? 0) + 1;

      for (const item of g.items) {
        if (item.especie) byEspecie[item.especie] = (byEspecie[item.especie] ?? 0) + 1;
        totalBultos += Number(item.cantidadBultos ?? 0);
        totalKg += Number(item.cantidadKg ?? 0);
      }
    }

    return { byEstado, byBarrera, byEspecie, byDestino, totalBultos, totalKg };
  }, [resultado]);

  const toggleEstado = (e: string) =>
    setEstados(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const limpiar = () => {
    setFechaDesde(primerDiaMesISO());
    setFechaHasta(hoyISO());
    setEstados([...ESTADOS]);
    setBarreraId('');
    setDestinoTipo('');
    setEspecieFiltro('');
    setTextoBusqueda('');
  };

  return (
    <div className="space-y-5 text-sm max-w-5xl">

      {/* ── Filtros ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-orange-500" />
            <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">Filtros</span>
          </div>
          <button
            onClick={limpiar}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition"
          >
            <X size={12} /> Limpiar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Fecha desde</label>
            <input
              type="date" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Fecha hasta</label>
            <input
              type="date" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Barrera</label>
            <select
              value={barreraId} onChange={e => setBarreraId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todas las barreras</option>
              {barreras.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Tipo de destino</label>
            <select
              value={destinoTipo} onChange={e => setDestinoTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todos</option>
              <option value="externo">Externo (Exportación)</option>
              <option value="interno">Mercado Interno</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Especie / Producto</label>
            <select
              value={especieFiltro} onChange={e => setEspecieFiltro(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todas las especies</option>
              {especiesDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">Búsqueda libre</label>
            <input
              type="text"
              placeholder="Remitente, conductor, patente, destino..."
              value={textoBusqueda} onChange={e => setTextoBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <label className="block text-xs text-gray-500 font-medium mb-2">Estado</label>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <button
                key={e} onClick={() => toggleEstado(e)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                  estados.includes(e) ? ESTADO_STYLE[e] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resultado header ── */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-700">
          {resultado.length} guía{resultado.length !== 1 ? 's' : ''} encontrada{resultado.length !== 1 ? 's' : ''}
        </p>
        {resultado.length > 0 && (
          <button
            onClick={() => exportarCSV(resultado)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md transition"
          >
            <Download size={13} /> Exportar CSV
          </button>
        )}
      </div>

      {/* ── Tarjetas resumen ── */}
      {resultado.length > 0 && (
        <div className="space-y-3">
          {/* Estados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ESTADOS.map(e => stats.byEstado[e] ? (
              <div key={e} className={`rounded-lg p-3 border ${ESTADO_STYLE[e]}`}>
                <p className="text-2xl font-extrabold">{stats.byEstado[e]}</p>
                <p className="text-xs font-medium mt-0.5 capitalize">{e}</p>
              </div>
            ) : null)}
          </div>
          {/* Bultos y Kg — fila separada con números grandes formateados */}
          {(stats.totalBultos > 0 || stats.totalKg > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {stats.totalBultos > 0 && (
                <div className="rounded-lg p-4 border bg-blue-50 text-blue-700 border-blue-200">
                  <p className="text-3xl font-extrabold leading-none">{fmtNum(stats.totalBultos)}</p>
                  <p className="text-xs font-medium mt-1.5">
                    Bultos totales
                    <span className="ml-2 text-blue-400 font-normal">{stats.totalBultos.toLocaleString('es-AR')}</span>
                  </p>
                </div>
              )}
              {stats.totalKg > 0 && (
                <div className="rounded-lg p-4 border bg-purple-50 text-purple-700 border-purple-200">
                  <p className="text-3xl font-extrabold leading-none">{fmtNum(stats.totalKg)}</p>
                  <p className="text-xs font-medium mt-1.5">
                    Kg totales
                    <span className="ml-2 text-purple-400 font-normal">{stats.totalKg.toLocaleString('es-AR')}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tablas de desglose ── */}
      {resultado.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.keys(stats.byEspecie).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Por especie</h4>
              <div className="space-y-2">
                {Object.entries(stats.byEspecie).sort((a, b) => b[1] - a[1]).map(([esp, n]) => (
                  <div key={esp} className="flex justify-between items-center">
                    <span className="text-gray-700">{esp}</span>
                    <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(stats.byBarrera).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Por barrera</h4>
              <div className="space-y-2">
                {Object.entries(stats.byBarrera).sort((a, b) => b[1] - a[1]).map(([bar, n]) => (
                  <div key={bar} className="flex justify-between items-center">
                    <span className="text-gray-700 text-xs">{bar}</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(stats.byDestino).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Por destino</h4>
              <div className="space-y-2">
                {Object.entries(stats.byDestino).sort((a, b) => b[1] - a[1]).map(([dest, n]) => (
                  <div key={dest} className="flex justify-between items-center">
                    <span className="text-gray-700 text-xs">{dest}</span>
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabla detalle ── */}
      {resultado.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <p className="text-gray-400 font-semibold text-base mb-1">Sin resultados</p>
          <p className="text-gray-400 text-xs">Modificá los filtros para encontrar guías.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Número', 'Fecha', 'Remitente', 'Especie/s', 'Destino', 'Barrera', 'Conductor / Patente', 'Estado'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase text-xs tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultado.map(g => {
                  const especies = [...new Set(g.items.map(i => i.especie).filter(Boolean))].join(', ');
                  const destinoRaw = g.destinoTipo === 'externo'
                    ? [g.destinoPais, g.destinoPuntoSalida].filter(Boolean).join(' / ') || 'Externo'
                    : [g.destinoProvincia, g.destinoMercadoInterno].filter(Boolean).join(' / ') || 'Interno';
                  const destino = normalizarDestino(destinoRaw);
                  return (
                    <tr key={g.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-orange-700 whitespace-nowrap">{g.numero}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtFecha(g.fechaEmision)}</td>
                      <td className="px-3 py-2 text-gray-800">{g.remitenteNombre}</td>
                      <td className="px-3 py-2 text-gray-700">{especies || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{destino}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{g.barrieraNombre ?? '—'}</td>
                      <td className="px-3 py-2">
                        <p className="text-gray-800">{g.transporteConductor}</p>
                        <p className="text-gray-400 font-mono">{g.transporteCamionPatente}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ESTADO_STYLE[g.estado] ?? 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {g.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
