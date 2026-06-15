import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { tipo, periodo, data } = await request.json()

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', session.user.id)
      .single()

    const { data: clinica } = await supabase
      .from('clinicas')
      .select('nombre, logo_url, ciudad, estado')
      .eq('id', usuario?.clinica_id)
      .single()

    // Generar HTML para el PDF
    const fechaActual = new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Ejecutivo - ${clinica?.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1E293B; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 32px 40px; }
    .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 14px; opacity: 0.85; }
    .meta { font-size: 12px; opacity: 0.75; margin-top: 8px; }
    .content { padding: 32px 40px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #1E293B; }
    .kpi-sub { font-size: 12px; color: #94A3B8; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F1F5F9; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-success { background: #DCFCE7; color: #16A34A; }
    .badge-primary { background: #E0E7FF; color: #4F46E5; }
    .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 11px; color: #94A3B8; }
    @media print { body { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${clinica?.nombre || 'Aprendamos Juntos'}</h1>
    <p>Reporte Ejecutivo de Operaciones</p>
    <div class="meta">
      Generado el ${fechaActual} · Período: últimos ${periodo} meses · ${clinica?.ciudad ? `${clinica.ciudad}, ${clinica.estado}` : ''}
    </div>
  </div>
  
  <div class="content">
    <div class="section">
      <div class="section-title">Resumen de indicadores clave</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Pacientes activos</div>
          <div class="kpi-value">${data?.statsResumen?.pacientesActivos || 0}</div>
          <div class="kpi-sub">de ${data?.statsResumen?.totalPacientes || 0} totales</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Citas este mes</div>
          <div class="kpi-value">${data?.statsResumen?.citasMes || 0}</div>
          <div class="kpi-sub">${data?.statsResumen?.asistenciaMes || 0}% de asistencia</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ingresos del mes</div>
          <div class="kpi-value">$${Number(data?.statsResumen?.ingresosMes || 0).toLocaleString('es-MX')}</div>
          <div class="kpi-sub">Total facturado</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total sesiones</div>
          <div class="kpi-value">${data?.statsResumen?.sesionesTotal || 0}</div>
          <div class="kpi-sub">Sesiones registradas</div>
        </div>
      </div>
    </div>

    ${data?.dataMensual?.length > 0 ? `
    <div class="section">
      <div class="section-title">Tendencia mensual de citas</div>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Programadas</th>
            <th>Completadas</th>
            <th>Nuevos pacientes</th>
            <th>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          ${data.dataMensual.map((m: any) => `
          <tr>
            <td>${m.mes}</td>
            <td>${m.citas}</td>
            <td><span class="badge badge-success">${m.completadas}</span></td>
            <td>${m.nuevos_pacientes}</td>
            <td>$${Number(m.ingresos).toLocaleString('es-MX')}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data?.dataTerapeutas?.length > 0 ? `
    <div class="section">
      <div class="section-title">Productividad por terapeuta</div>
      <table>
        <thead>
          <tr>
            <th>Terapeuta</th>
            <th>Citas</th>
            <th>Completadas</th>
            <th>% Asistencia</th>
            <th>Pacientes</th>
          </tr>
        </thead>
        <tbody>
          ${data.dataTerapeutas.map((t: any) => `
          <tr>
            <td>${t.nombre}</td>
            <td>${t.citas}</td>
            <td>${t.completadas}</td>
            <td><span class="badge ${t.asistencia >= 80 ? 'badge-success' : 'badge-primary'}">${t.asistencia}%</span></td>
            <td>${t.pacientes}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Reporte generado por Aprendamos Juntos · Sistema de Gestión de Terapia Ocupacional Infantil</p>
    <p style="margin-top: 4px;">Este documento es confidencial y para uso interno exclusivamente</p>
  </div>
</body>
</html>`

    // Retornar HTML que el cliente puede imprimir como PDF
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

  } catch (error: any) {
    console.error('Error generando reporte PDF:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte', details: error?.message },
      { status: 500 }
    )
  }
}
