import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldAlert,
} from 'lucide-react';

export default function Estadisticas({ user, categoryFilter }) {
  const [periodo, setPeriodo] = useState('mensual'); // 'semanal', 'mensual', 'temporada'

  // GENERADOR DINÁMICO DE DATOS (Simula la DB según Categoría y Periodo)
  const getData = () => {
    const mult = periodo === 'semanal' ? 1 : periodo === 'mensual' ? 4 : 20;
    const isAll = categoryFilter === 'Todas';
    const baseTotal = isAll ? 6 : 2; // Si ve todo el club hay más volumen que en una sola categoría

    return {
      total: baseTotal * mult,
      recaidas: isAll ? Math.floor(1.5 * mult) : Math.floor(0.5 * mult),
      timeLossAvg: 11, // Promedio en días
      contexto: { entreno: 45, partido: 40, otros: 15 },
      zonas: [
        { name: 'Isquiotibial', val: 40 },
        { name: 'Tobillo', val: 35 },
        { name: 'Rodilla', val: 25 },
      ],
      peso: { mantiene: 60, sube: 25, baja: 15 },
      // MAGIA CLÍNICA: Si ve todo el club, compara categorías. Si ve una sola, compara posiciones.
      distribucion: isAll
        ? { Mayor: 35, Especial: 25, 'Sub-15': 20, 'Cat A': 20 }
        : { Defensas: 40, Medios: 30, Delanteros: 20, Porteros: 10 },
    };
  };

  const data = getData();
  const distLabel =
    categoryFilter === 'Todas'
      ? 'Incidencia por Categoría'
      : 'Incidencia por Posición';

  // VALIDACIÓN DE SEGURIDAD (Por si alguien intenta forzar una categoría no permitida)
  const hasAccess =
    user.categories.includes('ALL') ||
    user.categories.includes(categoryFilter) ||
    categoryFilter === 'Todas';
  if (!hasAccess && categoryFilter !== 'Todas') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="bg-red-50 text-red-800 p-6 rounded-2xl border border-red-200 text-center max-w-md shadow-sm">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-sm">
            No tienes permisos para visualizar las estadísticas de la categoría{' '}
            <strong>{categoryFilter}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // GENERAR PDF DEL REPORTE DIRECTIVO / CUERPO TÉCNICO
  const generarReportePDF = () => {
    const ventana = window.open('', '_blank');
    const periodoTxt =
      periodo === 'semanal'
        ? 'Semanal'
        : periodo === 'mensual'
        ? 'Mensual'
        : 'de la Temporada';
    const distTitle =
      categoryFilter === 'Todas'
        ? '5. INCIDENCIA POR CATEGORÍAS (RIESGO GLOBAL)'
        : '5. INCIDENCIA POR POSICIÓN TÁCTICA';

    ventana.document.write(`
      <html><head><title>Reporte Epidemiológico - ${categoryFilter}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px; padding: 10px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 14px; border-radius: 5px;" id="instruccion">
          <strong>Para enviar por WhatsApp o Imprimir:</strong> Selecciona <strong>"Guardar como PDF"</strong>.
        </div>
        <h1 style="color: #000080; border-bottom: 2px solid #000080; padding-bottom: 10px;">Comunicaciones F.C. - Depto. Médico</h1>
        <h2 style="text-align: center; margin-top: 20px; text-transform: uppercase;">REPORTE EPIDEMIOLÓGICO ${periodoTxt}</h2>
        
        <div style="margin-top: 30px; font-size: 16px; line-height: 1.6;">
          <p><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString(
            'es-ES'
          )}</p>
          <p><strong>Categoría Reportada:</strong> ${
            categoryFilter === 'Todas'
              ? 'Plantel Completo (Todas)'
              : categoryFilter
          }</p>
          <p><strong>Generado por:</strong> ${user.name}</p>
          
          <h3 style="color: #000080; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">1. INDICADORES CLAVE (KPIs)</h3>
          <ul>
            <li><strong>Total de Lesiones Registradas:</strong> ${
              data.total
            } casos.</li>
            <li><strong>Tasa de Recaídas:</strong> ${
              data.recaidas
            } casos reportados.</li>
            <li><strong>Promedio de Recuperación (Time-Loss):</strong> ${
              data.timeLossAvg
            } días.</li>
          </ul>

          <h3 style="color: #000080; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">2. CONTEXTO DE LAS LESIONES</h3>
          <ul>
            <li><strong>En Partido Oficial/Amistoso:</strong> ${
              data.contexto.partido
            }%</li>
            <li><strong>En Entrenamiento:</strong> ${
              data.contexto.entreno
            }%</li>
            <li><strong>Enfermedad Común u Otros:</strong> ${
              data.contexto.otros
            }%</li>
          </ul>

          <h3 style="color: #000080; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">3. ZONAS ANATÓMICAS MÁS AFECTADAS</h3>
          <ul>
            ${data.zonas
              .map(
                (z) =>
                  `<li><strong>${z.name}:</strong> ${z.val}% de incidencia.</li>`
              )
              .join('')}
          </ul>

          <h3 style="color: #000080; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">4. CONTROL NUTRICIONAL Y PESO</h3>
          <ul>
            <li><strong>Mantienen peso ideal:</strong> ${
              data.peso.mantiene
            }% de los jugadores.</li>
            <li><strong>Alerta por Aumento (Grasa):</strong> ${
              data.peso.sube
            }% de los jugadores.</li>
            <li><strong>Alerta por Déficit (Masa Muscular):</strong> ${
              data.peso.baja
            }% de los jugadores.</li>
          </ul>

          <h3 style="color: #000080; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">${distTitle}</h3>
          <ul>
            ${Object.entries(data.distribucion)
              .map(
                ([key, val]) =>
                  `<li><strong>${key}:</strong> representa el ${val}% de las incidencias.</li>`
              )
              .join('')}
          </ul>
        </div>

        <div style="margin-top: 100px; text-align: center;">
          <hr style="border-top: 1px solid #000; width: 300px; margin: 0 auto;" />
          <p style="margin-top: 10px;"><strong>${user.name}</strong></p>
          <p style="font-size: 14px; color: #666;">Departamento Médico / Fisioterapia - C.F. Comunicaciones</p>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              document.getElementById('instruccion').style.display = 'none';
              window.print();
            }, 500);
          }
        </script>
      </body></html>
    `);
    ventana.document.close();
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in relative max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000080] flex items-center gap-3">
            <BarChart3 size={28} className="text-blue-600" /> Sala de Mando:
            Epidemiología
          </h2>
          <p className="text-gray-500 font-bold mt-1">
            Filtro de Datos:{' '}
            <span className="text-blue-500 uppercase">{categoryFilter}</span>
          </p>
        </div>

        {/* SELECTOR DE TIEMPO */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-full md:w-auto">
          <button
            onClick={() => setPeriodo('semanal')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm transition ${
              periodo === 'semanal'
                ? 'bg-[#000080] text-white shadow'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriodo('mensual')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm transition ${
              periodo === 'mensual'
                ? 'bg-[#000080] text-white shadow'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriodo('temporada')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm transition ${
              periodo === 'temporada'
                ? 'bg-[#000080] text-white shadow'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Temporada
          </button>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={generarReportePDF}
          className="bg-white border-2 border-[#000080] text-[#000080] hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-all"
        >
          <FileText size={18} /> Generar Reporte PDF ({periodo})
        </button>
      </div>

      {/* 1. KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-red-100 text-red-600 p-4 rounded-full">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold uppercase">
              Lesiones Totales
            </p>
            <p className="text-3xl font-extrabold text-gray-800">
              {data.total}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-full">
            <RefreshCcw size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold uppercase">
              Tasa de Recaídas
            </p>
            <p className="text-3xl font-extrabold text-gray-800">
              {data.recaidas}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-full">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold uppercase">
              Time-Loss Promedio
            </p>
            <p className="text-3xl font-extrabold text-gray-800">
              {data.timeLossAvg}{' '}
              <span className="text-lg text-gray-500">días</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 2. CONTEXTO DE LA LESIÓN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#000080] mb-6 flex items-center gap-2">
            Contexto de la Lesión
          </h3>
          <div className="h-8 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${data.contexto.partido}%` }}
              className="bg-red-500 h-full transition-all duration-500"
              title={`Partido: ${data.contexto.partido}%`}
            ></div>
            <div
              style={{ width: `${data.contexto.entreno}%` }}
              className="bg-yellow-400 h-full transition-all duration-500"
              title={`Entreno: ${data.contexto.entreno}%`}
            ></div>
            <div
              style={{ width: `${data.contexto.otros}%` }}
              className="bg-blue-400 h-full transition-all duration-500"
              title={`Enfermedad/Otros: ${data.contexto.otros}%`}
            ></div>
          </div>
          <div className="flex justify-between mt-4 text-sm font-bold">
            <div className="flex items-center gap-1 text-red-700">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>Partido (
              {data.contexto.partido}%)
            </div>
            <div className="flex items-center gap-1 text-yellow-700">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>Entreno
              ({data.contexto.entreno}%)
            </div>
            <div className="flex items-center gap-1 text-blue-700">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>Otros (
              {data.contexto.otros}%)
            </div>
          </div>
        </div>

        {/* 3. TERMÓMETRO DE PESO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#000080] mb-6 flex items-center gap-2">
            Fluctuación de Peso ({categoryFilter})
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold text-green-700 mb-1">
                <span>
                  <Minus size={14} className="inline mr-1" />
                  Mantienen Peso Ideal
                </span>
                <span>{data.peso.mantiene}%</span>
              </div>
              <div className="h-3 w-full bg-green-50 rounded-full overflow-hidden">
                <div
                  style={{ width: `${data.peso.mantiene}%` }}
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold text-red-600 mb-1">
                <span>
                  <TrendingUp size={14} className="inline mr-1" />
                  Subieron (Alerta Grasa)
                </span>
                <span>{data.peso.sube}%</span>
              </div>
              <div className="h-3 w-full bg-red-50 rounded-full overflow-hidden">
                <div
                  style={{ width: `${data.peso.sube}%` }}
                  className="bg-red-500 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold text-orange-500 mb-1">
                <span>
                  <TrendingDown size={14} className="inline mr-1" />
                  Bajaron (Déficit Muscular)
                </span>
                <span>{data.peso.baja}%</span>
              </div>
              <div className="h-3 w-full bg-orange-50 rounded-full overflow-hidden">
                <div
                  style={{ width: `${data.peso.baja}%` }}
                  className="bg-orange-400 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. TOP ZONAS ANATÓMICAS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#000080] mb-4">
            Top Zonas Anatómicas
          </h3>
          <div className="space-y-4">
            {data.zonas.map((z, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                  <span>
                    {idx + 1}. {z.name}
                  </span>
                  <span>{z.val}%</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-sm overflow-hidden">
                  <div
                    style={{ width: `${z.val}%` }}
                    className="bg-[#000080] h-full transition-all duration-500"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. INCIDENCIA DINÁMICA (Categorías vs Posiciones) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#000080] mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> {distLabel}
          </h3>
          <div className="flex h-48 items-end gap-2 mt-4 border-b border-gray-200 pb-2">
            {Object.entries(data.distribucion).map(([key, val], idx) => {
              const max = Math.max(...Object.values(data.distribucion));
              const height = (val / max) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  <span className="text-xs font-bold text-[#000080] mb-1">
                    {val}%
                  </span>
                  <div
                    style={{ height: `${height}%` }}
                    className="w-full bg-blue-400 hover:bg-blue-600 rounded-t-md transition-all duration-500"
                  ></div>
                  <span className="text-[10px] md:text-xs text-gray-600 font-bold mt-2 truncate w-full text-center">
                    {key}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
