-- Portal padres: columnas y políticas RLS
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE reportes_ia
  ADD COLUMN IF NOT EXISTS enviado_a_padres BOOLEAN DEFAULT FALSE;

DROP POLICY IF EXISTS "Familiar ve su registro" ON familiares;
CREATE POLICY "Familiar ve su registro"
  ON familiares FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff gestiona familiares" ON familiares;
CREATE POLICY "Staff gestiona familiares"
  ON familiares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = familiares.paciente_id
      AND p.clinica_id = get_clinica_id()
      AND get_user_rol() != 'padre'
    )
  );

DROP POLICY IF EXISTS "Padre ve reportes compartidos" ON reportes_ia;
CREATE POLICY "Padre ve reportes compartidos"
  ON reportes_ia FOR SELECT
  USING (
    enviado_a_padres = TRUE
    AND EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = reportes_ia.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff gestiona reportes ia" ON reportes_ia;
CREATE POLICY "Staff gestiona reportes ia"
  ON reportes_ia FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

DROP POLICY IF EXISTS "Padre ve archivos de su hijo" ON archivos_paciente;
CREATE POLICY "Padre ve archivos de su hijo"
  ON archivos_paciente FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = archivos_paciente.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff gestiona archivos" ON archivos_paciente;
CREATE POLICY "Staff gestiona archivos"
  ON archivos_paciente FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = archivos_paciente.paciente_id
      AND p.clinica_id = get_clinica_id()
      AND get_user_rol() != 'padre'
    )
  );

DROP POLICY IF EXISTS "Padre envía mensajes" ON chat_mensajes;
CREATE POLICY "Padre envía mensajes"
  ON chat_mensajes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM familiares f
      JOIN pacientes p ON p.id = f.paciente_id
      WHERE f.paciente_id = chat_mensajes.paciente_id
      AND f.auth_user_id = auth.uid()
      AND p.clinica_id = chat_mensajes.clinica_id
    )
  );

DROP POLICY IF EXISTS "Staff gestiona chat" ON chat_mensajes;
CREATE POLICY "Staff gestiona chat"
  ON chat_mensajes FOR ALL
  USING (clinica_id = get_clinica_id() AND get_user_rol() != 'padre');

DROP POLICY IF EXISTS "Padre confirma citas" ON citas;
CREATE POLICY "Padre confirma citas"
  ON citas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = citas.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = citas.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  );
