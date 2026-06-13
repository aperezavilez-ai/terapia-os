// TerapiaOS - Complete TypeScript Types

export type RolUsuario = 'admin_general' | 'director_clinico' | 'recepcion' | 'terapeuta' | 'padre'
export type EstadoCita = 'programada' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
export type TipoEvaluacion = 'motricidad_fina' | 'motricidad_gruesa' | 'integracion_sensorial' | 'atencion' | 'conducta' | 'cognitivo'
export type EstadoObjetivo = 'pendiente' | 'en_progreso' | 'logrado' | 'cancelado'
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'parcial' | 'cancelado'
export type TipoReporteIA = 'reporte' | 'resumen' | 'tareas' | 'analisis' | 'patrones'
export type EstadoMensajeWA = 'pendiente' | 'enviado' | 'entregado' | 'leido' | 'fallido'
export type PlanSaaS = 'basico' | 'profesional' | 'enterprise'

export interface Clinica {
  id: string
  created_at: string
  updated_at: string
  nombre: string
  rfc?: string
  telefono?: string
  email?: string
  sitio_web?: string
  logo_url?: string
  direccion?: string
  ciudad?: string
  estado?: string
  pais?: string
  color_primario?: string
  plan: PlanSaaS
  activa: boolean
  max_usuarios: number
  max_pacientes: number
  storage_gb: number
  storage_usado_mb: number
}

export interface Sucursal {
  id: string
  clinica_id: string
  nombre: string
  direccion?: string
  ciudad?: string
  estado?: string
  telefono?: string
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  clinica_id: string
  sucursal_id?: string
  nombre: string
  apellidos: string
  email: string
  rol: RolUsuario
  telefono?: string
  foto_url?: string
  activo: boolean
  ultimo_acceso?: string
  created_at: string
  updated_at: string
}

export interface Paciente {
  id: string
  clinica_id: string
  nombre: string
  apellidos: string
  fecha_nacimiento: string
  sexo?: 'masculino' | 'femenino' | 'otro'
  genero?: string
  curp?: string
  nss?: string
  grupo_sanguineo?: string
  lateralidad?: string
  foto_url?: string
  escuela?: string
  grado_escolar?: string
  turno_escolar?: string
  fecha_inicio?: string
  diagnostico_principal?: string
  diagnostico_secundario?: string
  diagnosticos?: any[]
  motivo_consulta?: string
  antecedentes_medicos?: string
  antecedentes_familiares?: string
  antecedentes?: string
  medicamentos?: string[]
  alergias?: string[]
  embarazo?: string
  parto?: string
  desarrollo_motor?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Familiar {
  id: string
  paciente_id: string
  clinica_id: string
  nombre: string
  parentesco: string
  telefono?: string
  email?: string
  tiene_acceso_portal: boolean
  es_contacto_emergencia: boolean
  tutor_legal: boolean
  created_at: string
  updated_at: string
}

export interface ArchivoPaciente {
  id: string
  paciente_id: string
  clinica_id: string
  subido_por: string
  nombre: string
  tipo: string
  url: string
  tamano_bytes?: number
  descripcion?: string
  created_at: string
  updated_at: string
}

export interface Cita {
  id: string
  clinica_id: string
  sucursal_id?: string
  paciente_id: string
  terapeuta_id: string
  tipo: string
  fecha_inicio: string
  fecha_fin?: string
  duracion_minutos?: number
  sala?: string
  estado: EstadoCita
  notas?: string
  recordatorio_24h: boolean
  recordatorio_1h: boolean
  confirmada_por_padre: boolean
  created_at: string
  updated_at: string
}

export interface Evaluacion {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  tipo: TipoEvaluacion
  fecha: string
  puntuacion_total?: number
  puntuacion_max?: number
  porcentaje?: number
  nivel?: string
  items?: any[]
  observaciones?: string
  recomendaciones?: string
  created_at: string
  updated_at: string
}

export interface CatalogoItemEvaluacion {
  id: string
  tipo_evaluacion: TipoEvaluacion
  area: string
  nombre: string
  descripcion?: string
  puntaje_max: number
  orden: number
  activo: boolean
}

export interface PlanTerapeutico {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  titulo: string
  objetivo_general: string
  justificacion?: string
  fecha_inicio: string
  fecha_fin_estimada?: string
  fecha_fin_real?: string
  estado: 'activo' | 'pausado' | 'finalizado' | 'cancelado'
  nivel_funcionamiento?: string
  areas_intervencion: string[]
  porcentaje_avance: number
  notas?: string
  created_at: string
  updated_at: string
}

export interface Objetivo {
  id: string
  plan_id: string
  tipo: 'general' | 'especifico'
  area?: string
  descripcion: string
  criterio_logro?: string
  fecha_meta?: string
  estado: EstadoObjetivo
  porcentaje: number
  orden: number
  created_at: string
  updated_at: string
}

export interface Sesion {
  id: string
  paciente_id: string
  terapeuta_id: string
  clinica_id: string
  plan_id?: string
  fecha: string
  duracion_minutos?: number
  actividades?: string
  actividades_json?: any[]
  avances?: string
  dificultades?: string
  estado_animo?: string
  nivel_cooperacion?: number
  tareas_casa?: string
  proxima_sesion?: string
  observaciones?: string
  evidencias?: string[]
  created_at: string
  updated_at: string
}

export interface TareasCasa {
  titulo: string
  descripcion: string
  frecuencia: string
}

export interface ReporteIA {
  id: string
  paciente_id: string
  clinica_id: string
  generado_por: string
  tipo: TipoReporteIA
  titulo?: string
  prompt: string
  contenido: string
  tokens_usados?: number
  modelo?: string
  enviado_a_padres: boolean
  tareas_casa?: TareasCasa[]
  recomendaciones?: string[]
  created_at: string
  updated_at: string
}

export interface Facturacion {
  id: string
  clinica_id: string
  sucursal_id?: string
  paciente_id: string
  folio?: string
  concepto: string
  subtotal: number
  descuento: number
  iva: number
  total: number
  estado: EstadoPago
  metodo_pago?: string
  fecha_pago?: string
  fecha_vencimiento?: string
  notas?: string
  created_at: string
  updated_at: string
}

export interface MensajeWhatsapp {
  id: string
  clinica_id: string
  paciente_id?: string
  familiar_id?: string
  enviado_por?: string
  telefono_destino: string
  tipo_mensaje: string
  plantilla?: string
  contenido: string
  wa_message_id?: string
  estado: EstadoMensajeWA
  respuesta?: string
  leido_at?: string
  created_at: string
  updated_at: string
}

export interface ChatMensaje {
  id: string
  clinica_id: string
  paciente_id: string
  remitente_id: string
  tipo_remitente: 'terapeuta' | 'padre'
  contenido: string
  leido: boolean
  leido_at?: string
  created_at: string
  updated_at: string
}

export interface Notificacion {
  id: string
  usuario_id: string
  clinica_id: string
  tipo: 'cita' | 'mensaje' | 'pago' | 'sistema' | 'ia'
  titulo: string
  mensaje: string
  url_accion?: string
  leida: boolean
  leida_at?: string
  created_at: string
}

export interface ConfigWhatsapp {
  id: string
  clinica_id: string
  phone_number_id?: string
  access_token?: string
  webhook_verify_token?: string
  activo: boolean
  created_at: string
  updated_at: string
}
