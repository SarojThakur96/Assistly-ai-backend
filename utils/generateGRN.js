export const generateGRN = async (pool) => {
  const date = new Date();
  const prefix = date.toISOString().split("T")[0].replace(/-/g, "");
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM item_stock_entries WHERE TO_CHAR(date_of_entry, 'YYYYMMDD') = $1  AND is_deleted = false`,
    [prefix]
  );
  const count = parseInt(rows[0].count) + 1;
  return `GRN-${prefix}-${String(count).padStart(4, "0")}`;
};
