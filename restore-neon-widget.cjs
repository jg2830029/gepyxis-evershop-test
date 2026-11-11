const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const check = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public.widget_instance) AS instances,
        (SELECT COUNT(*) FROM public.widget_placement) AS placements
      FOR UPDATE
    `);

    if (
      Number(check.rows[0].instances) !== 0 ||
      Number(check.rows[0].placements) !== 0
    ) {
      throw new Error(
        "Las tablas ya contienen registros. Se cancela para evitar duplicados."
      );
    }

    const instance = await client.query(`
      INSERT INTO public.widget_instance
        (name, type, settings, status, theme)
      VALUES (
        'Demo Homepage Products',
        'collection_products',
        '{"count":8,"heading":null,"subText":null,"collection":"homepage","countPerRow":4,"viewAllLink":null,"viewAllLabel":null}'::jsonb,
        TRUE,
        NULL
      )
      RETURNING widget_instance_id
    `);

    const instanceId = instance.rows[0].widget_instance_id;

    const placement = await client.query(`
      INSERT INTO public.widget_placement
        (widget_instance_id, route, area, sort_order, entity_urn, theme)
      VALUES ($1, 'homepage', 'content', 10, NULL, NULL)
      RETURNING widget_placement_id, widget_instance_id, route, area
    `, [instanceId]);

    await client.query("COMMIT");

    console.log("Widget creado:");
    console.table(instance.rows);
    console.log("Colocación creada:");
    console.table(placement.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Operación cancelada:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
