import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    client.release();
    console.log("🟢 Connected to PostgreSQL database");
  } catch (error) {
    console.log("PostgreSQL connection error", error);
    process.exit(1);
  }
};

export { pool, connectDB };
