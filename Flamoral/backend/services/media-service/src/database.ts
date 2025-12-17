/**
 * Database export for services
 * Re-exports the database connection from infrastructure
 */
import db from './infrastructure/database/connection';

export { db };
export default db;
