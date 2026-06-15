'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PlusIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Facturacion, Paciente } from '@/types'

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'tarjeta', label: 'Tarjeta de crédito/débito' },
  { value: 'cheque', label: 'Cheque' },
]

const CONCEPTOS_DEFAULT = [
  'Sesión de terapia ocupacional',
  'Evaluación inicial',
  'Evaluación de seguimiento',
  'Valoración integral',
  'Consulta de retroalimentación',
  'Reporte clínico',
]

function ModalNuevoCobro({
  open, onClose, pacientes, onSave,
}: {
  open: boolean
  onClose: () => void
  pacientes: Paciente[]
  onSave: () => void
}) {
  const [form, setForm] = useState({
    paciente_id: '',
    concepto: '',
    concepto_custom: '',
    subtotal: '',
    descuento: '0',
    iva: '0',
    metodo_pago: 'efectivo',
    fecha_vencimiento: '',
    notas: '',
    registrar_pago: true,
  })
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  const subtotal = parseFloat(form.subtotal) || 0
  const descuento = parseFloat(form.descuento) || 0
  const iva = parseFloat(form.iva) || 0
  const total = subtotal - descuento + ((subtotal - descuento) * iva / 100)

  const handleGuardar = async () => {
    const concepto = form.concepto === 'custom' ? form.concepto_custom : form.concepto
    if (!form.paciente_id || !concepto || !form.subtotal) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id, sucursal_id').eq('id', session.user.id).single()
      if (!usuario) return

      const totalCalc = subtotal - descuento + ((subtotal - descuento) * iva / 100)
      const folio = `F${Date.now().toString().slice(-6)}`

      const { error } = await supabase.from('facturacion').insert({
        clinica_id: usuario.clinica_id,
        sucursal_id: usuario.sucursal_id,
        paciente_id: form.paciente_id,
        folio,
        concepto,
        subtotal,
        descuento,
        iva: (subtotal - descuento) * iva / 100,
        total: parseFloat(totalCalc.toFixed(2)),
        estado: form.registrar_pago ? 'pagado' : 'pendiente',
        metodo_pago: form.registrar_pago ? form.metodo_pago : null,
        fecha_pago: form.registrar_pago ? new Date().toISOString() : null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas: form.notas || null,
      })
      if (error) throw error
      toast.success('Cobro registrado exitosamente')
      onSave()
      onClose()
    } catch (err) {
      toast.error('Error al registrar el cobro')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Nuevo cobro</h2>
          <button onClick={onClose} className="btn-icon text-neutral-400"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">Paciente *</label>
            <select className="input" value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
              <option value="">Seleccionar paciente...</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Concepto *</label>
            <select className="input" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}>
              <option value="">Seleccionar concepto...</option>
              {CONCEPTOS_DEFAULT.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="custom">Otro concepto...</option>
            </select>
          </div>
          {form.concepto === 'custom' && (
            <div>
              <label className="label">Descripción del concepto</label>
              <input className="input" placeholder="Describe el servicio..." value={form.concepto_custom} onChange={e => setForm(f => ({ ...f, concepto_custom: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Subtotal ($) *</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01"
                value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} />
            </div>
            <div>
              <label className="label">IVA (%)</label>
              <select className="input" value={form.iva} onChange={e => setForm(f => ({ ...f, iva: e.target.value }))}>
                <option value="0">0%</option>
                <option value="16">16%</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descuento ($)</label>
            <input type="number" className="input" placeholder="0.00" min="0" step="0.01"
              value={form.descuento} onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))} />
          </div>

          {/* Total */}
          {subtotal > 0 && (
            <div className="bg-primary-50 rounded-xl p-4">
              <div className="space-y-1">
                {[
                  { label: 'Subtotal', valor: `$${subtotal.toFixed(2)}` },
                  descuento > 0 && { label: 'Descuento', valor: `-$${descuento.toFixed(2)}` },
                  iva > 0 && { label: `IVA (${form.iva}%)`, valor: `$${((subtotal - descuento) * iva / 100).toFixed(2)}` },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex justify-between text-sm text-neutral-600">
                    <span>{item.label}</span><span>{item.valor}</span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold text-neutral-900 pt-2 border-t border-primary-200">
                  <span>Total</span>
                  <span className="text-primary-700">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
            <input
              type="checkbox"
              id="registrar_pago"
              checked={form.registrar_pago}
              onChange={e => setForm(f => ({ ...f, registrar_pago: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="registrar_pago" className="text-sm text-neutral-700 cursor-pointer">
              Registrar como pagado ahora
            </label>
          </div>

          {form.registrar_pago && (
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          {!form.registrar_pago && (
            <div>
              <label className="label">Fecha de vencimiento</label>
              <input type="date" className="input" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={2} placeholder="Notas adicionales..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
            {guardando ? 'Guardando...' : 'Registrar cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<Facturacion[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [statsFinanciero, setStatsFinanciero] = useState({
    totalMes: 0, pendiente: 0, pagadoMes: 0, facturasPendientes: 0,
  })
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [facRes, pacsRes, statsRes] = await Promise.all([
        supabase.from('facturacion').select(`*, paciente:pacientes(nombre, apellidos)`).eq('clinica_id', usuario.clinica_id).order('created_at', { ascending: false }).limit(100),
        supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).eq('activo', true).order('nombre'),
        supabase.from('facturacion').select('total, estado, fecha_pago').eq('clinica_id', usuario.clinica_id),
      ])

      setFacturas((facRes.data || []) as unknown as Facturacion[])
      setPacientes((pacsRes.data || []) as Paciente[])

      const stats = statsRes.data || []
      const pendientes = stats.filter(f => f.estado === 'pendiente')
      const pagadoMes = stats.filter(f => f.estado === 'pagado' && f.fecha_pago >= inicioMes)
      setStatsFinanciero({
        totalMes: pagadoMes.reduce((s, f) => s + (f.total || 0), 0),
        pendiente: pendientes.reduce((s, f) => s + (f.total || 0), 0),
        pagadoMes: pagadoMes.length,
        facturasPendientes: pendientes.length,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const registrarPago = async (facturaId: string, metodoPago: string) => {
    try {
      const { error } = await supabase.from('facturacion').update({
        estado: 'pagado',
        fecha_pago: new Date().toISOString(),
        metodo_pago: metodoPago,
      }).eq('id', facturaId)
      if (error) throw error
      toast.success('Pago registrado')
      fetchData()
    } catch {
      toast.error('Error al registrar el pago')
    }
  }

  const facturasFiltradas = facturas.filter(f => filtroEstado === 'todos' ? true : f.estado === filtroEstado)

  const estadoIcon: Record<string, any> = {
    pagado: <CheckCircleIcon className="w-4 h-4 text-success-600" />,
    pendiente: <ClockIcon className="w-4 h-4 text-warning-500" />,
    vencido: <XCircleIcon className="w-4 h-4 text-danger-500" />,
    parcial: <ClockIcon className="w-4 h-4 text-primary-500" />,
    cancelado: <XCircleIcon className="w-4 h-4 text-neutral-400" />,
  }
  const estadoLabel: Record<string, string> = {
    pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido',
    parcial: 'Parcial', cancelado: 'Cancelado',
  }
  const estadoBadge: Record<string, string> = {
    pagado: 'badge-success', pendiente: 'badge-warning', vencido: 'badge-danger',
    parcial: 'badge-primary', cancelado: 'badge-neutral',
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="page-subtitle">Control de cobros y pagos</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nuevo cobro
        </button>
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del mes', value: `$${statsFinanciero.totalMes.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, icon: BanknotesIcon, color: 'success' },
          { label: 'Por cobrar', value: `$${statsFinanciero.pendiente.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, icon: ClockIcon, color: 'warning' },
          { label: 'Pagos recibidos', value: statsFinanciero.pagadoMes, icon: CheckCircleIcon, color: 'primary' },
          { label: 'Cobros pendientes', value: statsFinanciero.facturasPendientes, icon: DocumentTextIcon, color: 'danger' },
        ].map((kpi, i) => (
          <div key={i} className="stat-card">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              kpi.color === 'success' ? 'bg-success-100 text-success-600' :
              kpi.color === 'warning' ? 'bg-warning-100 text-warning-600' :
              kpi.color === 'primary' ? 'bg-primary-100 text-primary-600' :
              'bg-danger-100 text-danger-600'
            }`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <p className="stat-value text-xl">{kpi.value}</p>
            <p className="stat-label">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'pendiente', 'pagado', 'vencido', 'cancelado'].map(estado => (
          <button key={estado} onClick={() => setFiltroEstado(estado)}
            className={`btn btn-sm capitalize ${filtroEstado === estado ? 'btn-primary' : 'btn-secondary'}`}>
            {estado === 'todos' ? 'Todos' : estadoLabel[estado] || estado}
          </button>
        ))}
      </div>

      {/* Tabla de cobros */}
      <div className="card overflow-hidden">
        {loading ? (
          <div>{[...Array(5)].map((_, i) => (<div key={i} className="flex gap-4 px-5 py-4 border-b border-neutral-100"><div className="skeleton h-4 flex-1" /><div className="skeleton h-4 w-20" /><div className="skeleton h-6 w-16 rounded-full" /></div>))}</div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="empty-state py-14">
            <BanknotesIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin cobros registrados</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm mt-4">
              <PlusIcon className="w-4 h-4" /> Nuevo cobro
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              {['Paciente', 'Concepto', 'Total', 'Fecha', 'Estado', ''].map((h, i) => (
                <div key={i} className={`text-xs font-semibold text-neutral-500 uppercase tracking-wide ${
                  i === 0 ? 'col-span-3' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-2' : i === 4 ? 'col-span-1' : 'col-span-1'
                }`}>{h}</div>
              ))}
            </div>
            <div className="divide-y divide-neutral-100">
              {facturasFiltradas.map(f => (
                <div key={f.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-neutral-50 transition-colors">
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {(f as any).paciente?.nombre} {(f as any).paciente?.apellidos}
                    </p>
                    {f.folio && <p className="text-xs text-neutral-400 font-mono">{f.folio}</p>}
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-neutral-700 truncate">{f.concepto}</p>
                    {f.metodo_pago && (
                      <p className="text-xs text-neutral-400 capitalize">{f.metodo_pago.replace('_', ' ')}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      ${f.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    {f.descuento > 0 && (
                      <p className="text-xs text-success-600">-${f.descuento.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-neutral-600">
                      {format(new Date(f.created_at), 'd MMM yyyy', { locale: es })}
                    </p>
                    {f.fecha_pago && (
                      <p className="text-xs text-neutral-400">
                        Pagado: {format(new Date(f.fecha_pago), 'd MMM', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <span className={`badge ${estadoBadge[f.estado] || 'badge-neutral'}`}>
                      {estadoLabel[f.estado] || f.estado}
                    </span>
                  </div>
                  <div className="col-span-1 flex gap-1 justify-end">
                    {f.estado === 'pendiente' && (
                      <button
                        onClick={() => registrarPago(f.id, 'efectivo')}
                        className="btn-success btn-sm text-xs"
                        title="Registrar pago"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button className="btn-ghost btn-sm text-neutral-400" title="Descargar">
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ModalNuevoCobro open={modalOpen} onClose={() => setModalOpen(false)} pacientes={pacientes} onSave={fetchData} />
    </div>
  )
}
