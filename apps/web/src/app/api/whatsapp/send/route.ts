import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'

export async function POST(request: NextRequest) {
  try {
    const { telefono, mensaje, tipo, plantilla, pacienteId, familiarId } = await request.json()

    if (!telefono || !mensaje) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', session.user.id)
      .single()
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Obtener config de WhatsApp
    const { data: config } = await supabase
      .from('config_whatsapp')
      .select('*')
      .eq('clinica_id', usuario.clinica_id)
      .eq('activo', true)
      .maybeSingle()

    let waMessageId: string | null = null
    let estadoMensaje = 'enviado'

    // Solo enviar por WhatsApp API si está configurado
    if (config?.phone_number_id && config?.access_token) {
      try {
        const waResponse = await fetch(
          `${WHATSAPP_API_URL}/${config.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.access_token}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: telefono.replace(/\D/g, ''), // Solo dígitos
              type: 'text',
              text: { body: mensaje },
            }),
          }
        )

        if (waResponse.ok) {
          const waData = await waResponse.json()
          waMessageId = waData.messages?.[0]?.id
          estadoMensaje = 'enviado'
        } else {
          estadoMensaje = 'fallido'
          console.error('WhatsApp API error:', await waResponse.text())
        }
      } catch (waError) {
        console.error('Error enviando WhatsApp:', waError)
        estadoMensaje = 'fallido'
      }
    }

    // Registrar en base de datos
    const { data: msgGuardado } = await supabase
      .from('mensajes_whatsapp')
      .insert({
        clinica_id: usuario.clinica_id,
        paciente_id: pacienteId || null,
        familiar_id: familiarId || null,
        enviado_por: session.user.id,
        telefono_destino: telefono,
        tipo_mensaje: tipo || 'libre',
        plantilla: plantilla || null,
        contenido: mensaje,
        wa_message_id: waMessageId,
        estado: estadoMensaje,
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      mensaje: msgGuardado,
      enviado_wa: estadoMensaje === 'enviado',
      wa_id: waMessageId,
    })

  } catch (error: any) {
    console.error('Error en API WhatsApp:', error)
    return NextResponse.json(
      { error: 'Error al enviar mensaje', details: error?.message },
      { status: 500 }
    )
  }
}
