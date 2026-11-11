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
  const backup = {
    createdAt: new Date().toISOString(),
    widget_instance: (
      await pool.query("SELECT * FROM public.widget_instance ORDER BY widget_instance_id")
    ).rows,
    widget_placement: (
      await pool.query("SELECT * FROM public.widget_placement ORDER BY widget_placement_id")
    ).rows
  };

  console.log(JSON.stringify(backup, null, 2));
}

main()
  .catch(error => {
    console.error("Error:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
