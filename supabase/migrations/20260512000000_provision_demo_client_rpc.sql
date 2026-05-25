-- OPTIONAL / STAGING ONLY — do not call from production Paystack webhooks.
-- Intended for manual QA or internal demos. Production clients use the public homepage demo only.
--
-- Provision one demo machine per supported UI machine type with ~1 year of hourly history.
-- History is built by cycling rows from existing production machines (largest row count per table).
-- Types: evaporative+Cirrus (cirrus), airconditioner+CoolBreeze (coolbreeze), heatpump+Alliance (alliance).

CREATE OR REPLACE FUNCTION public.provision_demo_client_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donor_cirrus uuid;
  v_donor_cb uuid;
  v_donor_all uuid;
  v_mid_cirrus uuid;
  v_mid_cb uuid;
  v_mid_all uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user not found: %', p_user_id;
  END IF;

  SELECT m.machine_id INTO v_donor_cirrus
  FROM public.cirrus m
  GROUP BY m.machine_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT m.machine_id INTO v_donor_cb
  FROM public.coolbreeze m
  GROUP BY m.machine_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT m.machine_id INTO v_donor_all
  FROM public.alliance m
  GROUP BY m.machine_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  IF v_donor_cirrus IS NULL OR v_donor_cb IS NULL OR v_donor_all IS NULL THEN
    RAISE EXCEPTION 'demo donors missing: need at least one machine with history in cirrus, coolbreeze, and alliance';
  END IF;

  INSERT INTO public.machines (
    name, type, manufacturer, owner_id, location, api_key,
    is_connected, is_on, overall_status
  ) VALUES (
    'Demo · Cirrus evaporative',
    'evaporative',
    'Cirrus',
    p_user_id,
    'Demo — sample data',
    replace(gen_random_uuid()::text, '-', ''),
    true,
    true,
    'good'
  )
  RETURNING id INTO v_mid_cirrus;

  INSERT INTO public.machines (
    name, type, manufacturer, owner_id, location, api_key,
    is_connected, is_on, overall_status
  ) VALUES (
    'Demo · CoolBreeze air conditioner',
    'airconditioner',
    'CoolBreeze',
    p_user_id,
    'Demo — sample data',
    replace(gen_random_uuid()::text, '-', ''),
    true,
    true,
    'good'
  )
  RETURNING id INTO v_mid_cb;

  INSERT INTO public.machines (
    name, type, manufacturer, owner_id, location, api_key,
    is_connected, is_on, overall_status,
    temperature_setpoint
  ) VALUES (
    'Demo · Alliance heat pump',
    'heatpump',
    'Alliance',
    p_user_id,
    'Demo — sample data',
    replace(gen_random_uuid()::text, '-', ''),
    true,
    true,
    'good',
    55
  )
  RETURNING id INTO v_mid_all;

  INSERT INTO public.api_keys (key, machine_id, created_by, description)
  VALUES
    ('demo-' || substr(md5(random()::text || v_mid_cirrus::text), 1, 40), v_mid_cirrus, p_user_id, 'demo seed cirrus'),
    ('demo-' || substr(md5(random()::text || v_mid_cb::text), 1, 40), v_mid_cb, p_user_id, 'demo seed coolbreeze'),
    ('demo-' || substr(md5(random()::text || v_mid_all::text), 1, 40), v_mid_all, p_user_id, 'demo seed alliance');

  -- Cirrus: hourly timestamps over 1 year, cycling donor rows (cap donor pool for speed)
  WITH base AS (
    SELECT *
    FROM public.cirrus c
    WHERE c.machine_id = v_donor_cirrus
    ORDER BY c.timestamp DESC
    LIMIT 4000
  ),
  donor AS (
    SELECT
      c.ambient_temp,
      c.duct_temp,
      c.motor_temp,
      c.delta_t,
      c.voltage,
      c.current,
      c.power,
      c.fan_voltage,
      c.pump_voltage,
      c.drain_voltage,
      c.exhaust_voltage,
      c.fan_active,
      c.pump_active,
      c.drain_active,
      c.exhaust_active,
      c.is_cooling,
      c.is_on,
      c.is_connected,
      c.has_water,
      c.fan_status,
      c.pump_status,
      c.drain_status,
      c.exhaust_status,
      c.fan_speed,
      c.overall_status,
      c.motor_status,
      c.water_status,
      c.cooling_status,
      c.motor_temp_within_parameters,
      c.current_within_parameters,
      c.voltage_within_parameters,
      c.power_within_parameters,
      c.water_within_parameters,
      c.status_details,
      row_number() OVER (ORDER BY c.timestamp DESC) AS rn
    FROM base c
  ),
  dc AS (
    SELECT COUNT(*)::bigint AS cnt FROM donor
  ),
  hours AS (
    SELECT
      row_number() OVER (ORDER BY gs) AS idx,
      gs AS bucket_ts
    FROM generate_series(
      date_trunc('hour', clock_timestamp() - interval '1 year'),
      date_trunc('hour', clock_timestamp()),
      interval '1 hour'
    ) AS gs
  )
  INSERT INTO public.cirrus (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    voltage,
    current,
    power,
    fan_voltage,
    pump_voltage,
    drain_voltage,
    exhaust_voltage,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_on,
    is_connected,
    has_water,
    fan_status,
    pump_status,
    drain_status,
    exhaust_status,
    fan_speed,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    motor_temp_within_parameters,
    current_within_parameters,
    voltage_within_parameters,
    power_within_parameters,
    water_within_parameters,
    status_details
  )
  SELECT
    v_mid_cirrus,
    h.bucket_ts,
    d.ambient_temp,
    d.duct_temp,
    d.motor_temp,
    d.delta_t,
    d.voltage,
    d.current,
    d.power,
    d.fan_voltage,
    d.pump_voltage,
    d.drain_voltage,
    d.exhaust_voltage,
    d.fan_active,
    d.pump_active,
    d.drain_active,
    d.exhaust_active,
    d.is_cooling,
    d.is_on,
    d.is_connected,
    d.has_water,
    d.fan_status,
    d.pump_status,
    d.drain_status,
    d.exhaust_status,
    d.fan_speed,
    d.overall_status,
    d.motor_status,
    d.water_status,
    d.cooling_status,
    d.motor_temp_within_parameters,
    d.current_within_parameters,
    d.voltage_within_parameters,
    d.power_within_parameters,
    d.water_within_parameters,
    d.status_details
  FROM hours h
  CROSS JOIN dc
  INNER JOIN donor d ON dc.cnt > 0 AND d.rn = ((h.idx - 1) % dc.cnt) + 1;

  -- CoolBreeze
  WITH base AS (
    SELECT *
    FROM public.coolbreeze c
    WHERE c.machine_id = v_donor_cb
    ORDER BY c.timestamp DESC
    LIMIT 4000
  ),
  donor AS (
    SELECT
      c.ambient_temp,
      c.duct_temp,
      c.motor_temp,
      c.delta_t,
      c.voltage,
      c.current,
      c.power,
      c.fan_voltage,
      c.pump_voltage,
      c.drain_voltage,
      c.exhaust_voltage,
      c.fan_active,
      c.pump_active,
      c.drain_active,
      c.exhaust_active,
      c.is_cooling,
      c.is_on,
      c.is_connected,
      c.has_water,
      c.water_level,
      c.fan_status,
      c.pump_status,
      c.drain_status,
      c.exhaust_status,
      c.fan_speed,
      c.overall_status,
      c.motor_status,
      c.water_status,
      c.cooling_status,
      c.motor_temp_within_parameters,
      c.current_within_parameters,
      c.voltage_within_parameters,
      c.power_within_parameters,
      c.water_within_parameters,
      c.status_details,
      row_number() OVER (ORDER BY c.timestamp DESC) AS rn
    FROM base c
  ),
  dc AS (
    SELECT COUNT(*)::bigint AS cnt FROM donor
  ),
  hours AS (
    SELECT
      row_number() OVER (ORDER BY gs) AS idx,
      gs AS bucket_ts
    FROM generate_series(
      date_trunc('hour', clock_timestamp() - interval '1 year'),
      date_trunc('hour', clock_timestamp()),
      interval '1 hour'
    ) AS gs
  )
  INSERT INTO public.coolbreeze (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    voltage,
    current,
    power,
    fan_voltage,
    pump_voltage,
    drain_voltage,
    exhaust_voltage,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_on,
    is_connected,
    has_water,
    water_level,
    fan_status,
    pump_status,
    drain_status,
    exhaust_status,
    fan_speed,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    motor_temp_within_parameters,
    current_within_parameters,
    voltage_within_parameters,
    power_within_parameters,
    water_within_parameters,
    status_details
  )
  SELECT
    v_mid_cb,
    h.bucket_ts,
    d.ambient_temp,
    d.duct_temp,
    d.motor_temp,
    d.delta_t,
    d.voltage,
    d.current,
    d.power,
    d.fan_voltage,
    d.pump_voltage,
    d.drain_voltage,
    d.exhaust_voltage,
    d.fan_active,
    d.pump_active,
    d.drain_active,
    d.exhaust_active,
    d.is_cooling,
    d.is_on,
    d.is_connected,
    d.has_water,
    d.water_level,
    d.fan_status,
    d.pump_status,
    d.drain_status,
    d.exhaust_status,
    d.fan_speed,
    d.overall_status,
    d.motor_status,
    d.water_status,
    d.cooling_status,
    d.motor_temp_within_parameters,
    d.current_within_parameters,
    d.voltage_within_parameters,
    d.power_within_parameters,
    d.water_within_parameters,
    d.status_details
  FROM hours h
  CROSS JOIN dc
  INNER JOIN donor d ON dc.cnt > 0 AND d.rn = ((h.idx - 1) % dc.cnt) + 1;

  -- Alliance
  WITH base AS (
    SELECT *
    FROM public.alliance a
    WHERE a.machine_id = v_donor_all
    ORDER BY a.timestamp DESC
    LIMIT 4000
  ),
  donor AS (
    SELECT
      a.ambient_temp,
      a.duct_temp,
      a.motor_temp,
      a.delta_t,
      a.voltage,
      a.current,
      a.power,
      a.voltage_1,
      a.voltage_2,
      a.voltage_3,
      a.voltage_4,
      a.voltage_5,
      a.voltage_6,
      a.fan_active,
      a.pump_active,
      a.drain_active,
      a.exhaust_active,
      a.is_cooling,
      a.is_heating,
      a.is_on,
      a.is_connected,
      a.has_water,
      a.overall_status,
      a.motor_status,
      a.water_status,
      a.cooling_status,
      a.heating_status,
      a.compressor_status,
      a.compressor_issue_first_detected_at,
      a.motor_temp_within_parameters,
      a.current_within_parameters,
      a.voltage_within_parameters,
      a.power_within_parameters,
      a.water_within_parameters,
      a.setpoint_within_parameters,
      a.status_details,
      row_number() OVER (ORDER BY a.timestamp DESC) AS rn
    FROM base a
  ),
  dc AS (
    SELECT COUNT(*)::bigint AS cnt FROM donor
  ),
  hours AS (
    SELECT
      row_number() OVER (ORDER BY gs) AS idx,
      gs AS bucket_ts
    FROM generate_series(
      date_trunc('hour', clock_timestamp() - interval '1 year'),
      date_trunc('hour', clock_timestamp()),
      interval '1 hour'
    ) AS gs
  )
  INSERT INTO public.alliance (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    voltage,
    current,
    power,
    voltage_1,
    voltage_2,
    voltage_3,
    voltage_4,
    voltage_5,
    voltage_6,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_heating,
    is_on,
    is_connected,
    has_water,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    heating_status,
    compressor_status,
    compressor_issue_first_detected_at,
    motor_temp_within_parameters,
    current_within_parameters,
    voltage_within_parameters,
    power_within_parameters,
    water_within_parameters,
    setpoint_within_parameters,
    status_details
  )
  SELECT
    v_mid_all,
    h.bucket_ts,
    d.ambient_temp,
    d.duct_temp,
    d.motor_temp,
    d.delta_t,
    d.voltage,
    d.current,
    d.power,
    d.voltage_1,
    d.voltage_2,
    d.voltage_3,
    d.voltage_4,
    d.voltage_5,
    d.voltage_6,
    d.fan_active,
    d.pump_active,
    d.drain_active,
    d.exhaust_active,
    d.is_cooling,
    d.is_heating,
    d.is_on,
    d.is_connected,
    d.has_water,
    d.overall_status,
    d.motor_status,
    d.water_status,
    d.cooling_status,
    d.heating_status,
    d.compressor_status,
    d.compressor_issue_first_detected_at,
    d.motor_temp_within_parameters,
    d.current_within_parameters,
    d.voltage_within_parameters,
    d.power_within_parameters,
    d.water_within_parameters,
    d.setpoint_within_parameters,
    d.status_details
  FROM hours h
  CROSS JOIN dc
  INNER JOIN donor d ON dc.cnt > 0 AND d.rn = ((h.idx - 1) % dc.cnt) + 1;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'donors', jsonb_build_object(
      'cirrus', v_donor_cirrus,
      'coolbreeze', v_donor_cb,
      'alliance', v_donor_all
    ),
    'machines', jsonb_build_object(
      'cirrus_evaporative', v_mid_cirrus,
      'coolbreeze_aircon', v_mid_cb,
      'alliance_heatpump', v_mid_all
    ),
    'hourly_buckets_inserted_per_machine', (
      SELECT COUNT(*)::int
      FROM generate_series(
        date_trunc('hour', clock_timestamp() - interval '1 year'),
        date_trunc('hour', clock_timestamp()),
        interval '1 hour'
      ) AS gs
    )
  );
END;
$$;

COMMENT ON FUNCTION public.provision_demo_client_for_user(uuid) IS
  'STAGING/MANUAL ONLY: Creates 3 demo machines and ~1 year of hourly rows from donor data. Not used for production customer onboarding.';

REVOKE ALL ON FUNCTION public.provision_demo_client_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_demo_client_for_user(uuid) TO service_role;
