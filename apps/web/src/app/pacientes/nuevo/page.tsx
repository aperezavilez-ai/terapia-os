'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeftIcon, UserPlusIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const DIAGNOSTICOS_COMUNES = [
  'Trastorno del Espectro Autista (TEA)',
  'Trastorno por Déficit de Atención e Hiperactividad (TDAH)',
  'Parálisis Cerebral',
  'Síndrome de Down',
  'Retraso en el Desarrollo Psicomotor',
  'Trastorno de Procesamiento Sensorial',
  'Dislexia',
  'Discapacidad Intelectual',
  'Síndrome de Rett',
  'Hipotomía muscular',
  'Otro',
]

const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const LATERALIDADES = ['diestro', 'zurdo', 'ambidiestro', 'sin_definir']

export default function NuevoPacientePage() {
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState({
    // Datos básicos
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: '',
    curp: '',
    nss: '',
    grupo_sanguineo: '',
    lateralidad: '',
    escuela: '',
    grado_escolar: '',

    // Datos clínicos
    diagnostico_principal: '',
    diagnostico_secundario: '',
    motivo_consulta: '',
    antecedentes_medicos: '',
    medicamentos: '',
    alergias: '',
    antecedentes_familiares: '',
    embarazo: '',
    parto: '',
    desarrollo_motor: '',

    // Contacto de emergencia
    familiar_nombre: '',
    familiar_parentesco: '',
    familiar_telefono: '',
    familiar_email: '',
    familiar_tiene_acceso_portal: true,
  })
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const f = (campo: keyof typeof form, valor: string | boolean) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellidos || !form.fecha_nacimiento) {
      toast.error('Nombre, apellidos y fecha de nacimiento son obligatorios')
      return
    }
    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const { data: paciente, error } = await supabase.from('pacientes').insert({
        clinica_id: usuario.clinica_id,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo || null,
        curp: form.curp || null,
        nss: form.nss || null,
        grupo_sanguineo: form.grupo_sanguineo || null,
        lateralidad: form.lateralidad || null,
        escuela: form.escuela || null,
        grado_escolar: form.grado_escolar || null,
        diagnostico_principal: form.diagnostico_principal || null,
        diagnostico_secundario: form.diagnostico_secundario || null,
        motivo_consulta: form.motivo_consulta || null,
        antecedentes_medicos: form.antecedentes_medicos || null,
        medicamentos: form.medicamentos || null,
        alergias: form.alergias || null,
        antecedentes_familiares: form.antecedentes_familiares || null,
        embarazo: form.embarazo || null,
        parto: form.parto || null,
        desarrollo_motor: form.desarrollo_motor || null,
        activo: true,
      }).select().single()

      if (error) throw error

      // Insertar familiar si se proporcionaron datos
      if (form.familiar_nombre && form.familiar_telefono && paciente) {
        const { data: familiar, error: famError } = await supabase.from('familiares').insert({
          paciente_id: paciente.id,
          tipo_relacion: form.familiar_parentesco || 'tutor',
          nombre: form.familiar_nombre.trim(),
          telefono: form.familiar_telefono.trim(),
          email: form.familiar_email?.trim() || null,
          tiene_acceso_portal: form.familiar_tiene_acceso_portal,
          es_contacto_principal: true,
        }).select().single()

        if (famError) {
          console.error('Error al registrar familiar:', famError)
        } else if (form.familiar_tiene_acceso_portal && form.familiar_email?.trim() && familiar) {
          const partes = form.familiar_nombre.trim().split(/\s+/)
          const res = await fetch('/api/padres/crear-acceso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.familiar_email.trim(),
              nombre: partes[0] || form.familiar_nombre.trim(),
              apellidos: partes.slice(1).join(' ') || '',
              familiar_id: familiar.id,
              paciente_id: paciente.id,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast.success(`Portal creado. Contraseña temporal: ${data.password}`, { duration: 12000 })
          } else {
            toast.error(data.error || 'No se pudo crear el acceso al portal')
          }
        }
      }

      toast.success('Paciente registrado exitosamente')
      router.push(`/pacientes/${paciente?.id}`)
    } catch (err: any) {
      toast.error('Error al registrar el paciente')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const InputField = ({ label, campo, type = 'text', placeholder = '', required = false }: any) => (
    <div>
      <label className="label">{label}{required && <span className="text-danger-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[campo as keyof typeof form] as string}
        onChange={e => f(campo, e.target.value)}
        required={required}
      />
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/pacientes" className="btn-ghost btn-sm text-neutral-500">
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Nuevo Paciente</h1>
          <p className="page-subtitle">Paso {paso} de 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill bg-primary-500" style={{ width: `${(paso / 3) * 100}%` }} />
      </div>

      <div className="card p-6 space-y-5">
        {/* PASO 1: Datos personales */}
        {paso === 1 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Datos personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Nombre(s)" campo="nombre" required placeholder="Juan Diego" />
              <InputField label="Apellidos" campo="apellidos" required placeholder="García Martínez" />
              <InputField label="Fecha de nacimiento" campo="fecha_nacimiento" type="date" required />
              <div>
                <label className="label">Sexo</label>
                <select className="input" value={form.sexo} onChange={e => f('sexo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <InputField label="CURP" campo="curp" placeholder="GAEM010101HMCRNS00" />
              <InputField label="NSS (IMSS/ISSSTE)" campo="nss" placeholder="12345678900" />
              <div>
                <label className="label">Grupo sanguíneo</label>
                <select className="input" value={form.grupo_sanguineo} onChange={e => f('grupo_sanguineo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {GRUPOS_SANGUINEOS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lateralidad</label>
                <select className="input" value={form.lateralidad} onChange={e => f('lateralidad', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="diestro">Diestro</option>
                  <option value="zurdo">Zurdo</option>
                  <option value="ambidiestro">Ambidiestro</option>
                  <option value="sin_definir">Sin definir</option>
                </select>
              </div>
              <InputField label="Escuela" campo="escuela" placeholder="Primaria Benito Juárez" />
              <InputField label="Grado escolar" campo="grado_escolar" placeholder="3° de Primaria" />
            </div>
          </>
        )}

        {/* PASO 2: Datos clínicos */}
        {paso === 2 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Historia clínica
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Diagnóstico principal</label>
                <select className="input" value={form.diagnostico_principal} onChange={e => f('diagnostico_principal', e.target.value)}>
                  <option value="">Seleccionar diagnóstico...</option>
                  {DIAGNOSTICOS_COMUNES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <InputField label="Diagnóstico secundario" campo="diagnostico_secundario" placeholder="Diagnóstico secundario si aplica" />
              <div>
                <label className="label">Motivo de consulta</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Describa el motivo principal por el que se busca la terapia ocupacional..."
                  value={form.motivo_consulta} onChange={e => f('motivo_consulta', e.target.value)} />
              </div>
              <div>
                <label className="label">Antecedentes médicos relevantes</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Cirugías, hospitalizaciones, enfermedades previas relevantes..."
                  value={form.antecedentes_medicos} onChange={e => f('antecedentes_medicos', e.target.value)} />
              </div>
              <div>
                <label className="label">Medicamentos actuales</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="Nombre del medicamento, dosis y frecuencia..."
                  value={form.medicamentos} onChange={e => f('medicamentos', e.target.value)} />
              </div>
              <div>
                <label className="label">Alergias conocidas</label>
                <input className="input" placeholder="Alergias a medicamentos, alimentos, materiales..." value={form.alergias} onChange={e => f('alergias', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Datos del embarazo</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="Semanas de gestación, complicaciones, control prenatal..."
                    value={form.embarazo} onChange={e => f('embarazo', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tipo de parto</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="Natural, cesárea, complicaciones, uso de fórceps..."
                    value={form.parto} onChange={e => f('parto', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Desarrollo psicomotor</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Hitos del desarrollo: gateo, primeras palabras, caminar, control de esfínteres..."
                  value={form.desarrollo_motor} onChange={e => f('desarrollo_motor', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* PASO 3: Familiar/Contacto */}
        {paso === 3 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Tutor o familiar responsable
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Nombre completo" campo="familiar_nombre" placeholder="María García Pérez" required />
              <div>
                <label className="label">Parentesco</label>
                <select className="input" value={form.familiar_parentesco} onChange={e => f('familiar_parentesco', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="madre">Madre</option>
                  <option value="padre">Padre</option>
                  <option value="abuelo">Abuelo/a</option>
                  <option value="tutor">Tutor legal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <InputField label="Teléfono" campo="familiar_telefono" type="tel" placeholder="+52 33 1234 5678" required />
              <InputField label="Email" campo="familiar_email" type="email" placeholder="mama@email.com" />
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl mt-2">
              <input
                type="checkbox"
                id="acceso_portal"
                checked={form.familiar_tiene_acceso_portal}
                onChange={e => f('familiar_tiene_acceso_portal', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="acceso_portal" className="text-sm text-neutral-700 cursor-pointer">
                <span className="font-medium">Dar acceso al portal de padres</span>
                <br />
                <span className="text-xs text-neutral-500">
                  El familiar podrá ver citas, reportes y comunicarse con el terapeuta
                </span>
              </label>
            </div>

            {/* Resumen */}
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Resumen del paciente</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="text-neutral-500">Nombre:</div>
                <div className="font-medium text-neutral-900">{form.nombre} {form.apellidos}</div>
                <div className="text-neutral-500">Nacimiento:</div>
                <div className="font-medium">{form.fecha_nacimiento || '—'}</div>
                <div className="text-neutral-500">Diagnóstico:</div>
                <div className="font-medium">{form.diagnostico_principal || '—'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        {paso > 1 && (
          <button onClick={() => setPaso(p => p - 1)} className="btn-secondary">
            <ArrowLeftIcon className="w-4 h-4" /> Anterior
          </button>
        )}
        <Link href="/pacientes" className="btn-secondary">Cancelar</Link>
        <div className="flex-1" />
        {paso < 3 ? (
          <button
            onClick={() => setPaso(p => p + 1)}
            disabled={paso === 1 && (!form.nombre || !form.apellidos || !form.fecha_nacimiento)}
            className="btn-primary disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary">
            {guardando ? 'Guardando...' : 'Registrar paciente'}
            <UserPlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
