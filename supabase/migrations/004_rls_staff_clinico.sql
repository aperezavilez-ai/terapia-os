-- Políticas RLS faltantes para módulos clínicos y operativos

-- ── Evaluaciones ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona evaluaciones" ON evaluaciones;
CREATE POLICY "Staff gestiona evaluaciones"
  ON evaluaciones FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Planes terapéuticos ──────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona planes" ON planes_terapeuticos;
CREATE POLICY "Staff gestiona planes"
  ON planes_terapeuticos FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Objetivos ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona objetivos" ON objetivos;
CREATE POLICY "Staff gestiona objetivos"
  ON objetivos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM planes_terapeuticos pt
      WHERE pt.id = objetivos.plan_id
      AND pt.clinica_id = get_clinica_id()
      AND get_user_rol() != 'padre'
    )
  );

-- ── Indicadores ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona indicadores" ON indicadores;
CREATE POLICY "Staff gestiona indicadores"
  ON indicadores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM objetivos o
      JOIN planes_terapeuticos pt ON pt.id = o.plan_id
      WHERE o.id = indicadores.objetivo_id
      AND pt.clinica_id = get_clinica_id()
      AND get_user_rol() != 'padre'
    )
  );

-- ── Avances de objetivos ─────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona avances objetivo" ON avances_objetivo;
CREATE POLICY "Staff gestiona avances objetivo"
  ON avances_objetivo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM objetivos o
      JOIN planes_terapeuticos pt ON pt.id = o.plan_id
      WHERE o.id = avances_objetivo.objetivo_id
      AND pt.clinica_id = get_clinica_id()
      AND get_user_rol() != 'padre'
    )
  );

-- ── Sesiones (escritura staff) ───────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona sesiones" ON sesiones;
CREATE POLICY "Staff gestiona sesiones"
  ON sesiones FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Facturación ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona facturacion" ON facturacion;
CREATE POLICY "Staff gestiona facturacion"
  ON facturacion FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Mensajes WhatsApp ────────────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona mensajes whatsapp" ON mensajes_whatsapp;
CREATE POLICY "Staff gestiona mensajes whatsapp"
  ON mensajes_whatsapp FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Encuestas satisfacción ───────────────────────────────────
DROP POLICY IF EXISTS "Staff gestiona encuestas" ON encuestas_satisfaccion;
CREATE POLICY "Staff gestiona encuestas"
  ON encuestas_satisfaccion FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

-- ── Staff gestiona notificaciones de la clínica ──────────────
DROP POLICY IF EXISTS "Staff crea notificaciones" ON notificaciones;
CREATE POLICY "Staff crea notificaciones"
  ON notificaciones FOR INSERT
  WITH CHECK (
    clinica_id = get_clinica_id()
    AND get_user_rol() != 'padre'
  );

-- ── Alinear archivos padre con visible_a_padres (002 → 003) ──
DROP POLICY IF EXISTS "Padre ve archivos de su hijo" ON archivos_paciente;
CREATE POLICY "Padre ve archivos de su hijo"
  ON archivos_paciente FOR SELECT
  USING (
    visible_a_padres = TRUE
    AND EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = archivos_paciente.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  );
