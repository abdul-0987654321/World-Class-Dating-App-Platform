#!/usr/bin/env ts-node
import { Knex } from 'knex';
import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Database Vacuum and Analyze Script
 *
 * This script performs VACUUM and ANALYZE operations to:
 * - Reclaim storage from deleted rows
 * - Update table statistics for query planner
 * - Prevent transaction ID wraparound
 * - Improve query performance
 *
 * Usage:
 *   npm run db:vacuum              # Vacuum all tables
 *   npm run db:vacuum --full       # Full vacuum (locks tables)
 *   npm run db:vacuum --table=users # Vacuum specific table
 */

interface VacuumOptions {
  full?: boolean;
  verbose?: boolean;
  analyze?: boolean;
  table?: string;
}

class DatabaseMaintenance {
  private db: Knex;

  constructor() {
    this.db = knex({
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
      },
    });
  }

  /**
   * Get all user tables
   */
  async getUserTables(): Promise<string[]> {
    const result = await this.db.raw(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    return result.rows.map((row: any) => row.tablename);
  }

  /**
   * Get table bloat statistics
   */
  async getTableBloat(tableName?: string): Promise<any[]> {
    let query = `
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        n_dead_tup AS dead_tuples,
        n_live_tup AS live_tuples,
        ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS bloat_percentage
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 0
    `;

    if (tableName) {
      query += ` AND tablename = '${tableName}'`;
    }

    query += ' ORDER BY n_dead_tup DESC;';

    const result = await this.db.raw(query);
    return result.rows;
  }

  /**
   * Perform VACUUM operation
   */
  async vacuum(options: VacuumOptions = {}): Promise<void> {
    const { full = false, verbose = false, analyze = true, table } = options;

    try {
      console.log('='.repeat(60));
      console.log('DATABASE VACUUM OPERATION');
      console.log('='.repeat(60));
      console.log(`Started at: ${new Date().toISOString()}`);
      console.log(`Full vacuum: ${full}`);
      console.log(`Analyze: ${analyze}`);
      console.log(`Verbose: ${verbose}`);

      if (table) {
        console.log(`Target table: ${table}`);
        console.log('-'.repeat(60));

        // Get bloat before vacuum
        const bloatBefore = await this.getTableBloat(table);
        if (bloatBefore.length > 0) {
          console.log('\nBloat statistics before vacuum:');
          console.table(bloatBefore);
        }

        // Perform vacuum
        const startTime = Date.now();
        await this.vacuumTable(table, { full, verbose, analyze });
        const duration = Date.now() - startTime;

        // Get bloat after vacuum
        const bloatAfter = await this.getTableBloat(table);
        if (bloatAfter.length > 0) {
          console.log('\nBloat statistics after vacuum:');
          console.table(bloatAfter);
        }

        console.log(`\n✓ Vacuum completed for table '${table}' in ${duration}ms`);
      } else {
        // Vacuum all tables
        const tables = await this.getUserTables();
        console.log(`Found ${tables.length} tables to vacuum`);
        console.log('-'.repeat(60));

        // Get bloat statistics before vacuum
        const bloatBefore = await this.getTableBloat();
        if (bloatBefore.length > 0) {
          console.log('\nTables with bloat (top 10):');
          console.table(bloatBefore.slice(0, 10));
        }

        let successCount = 0;
        let failCount = 0;

        for (const tableName of tables) {
          try {
            const startTime = Date.now();
            await this.vacuumTable(tableName, { full, verbose, analyze });
            const duration = Date.now() - startTime;
            console.log(`✓ Vacuumed '${tableName}' (${duration}ms)`);
            successCount++;
          } catch (error: any) {
            console.error(`✗ Failed to vacuum '${tableName}': ${error.message}`);
            failCount++;
          }
        }

        console.log('-'.repeat(60));
        console.log(`\nSummary:`);
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${failCount}`);
        console.log(`  Total: ${tables.length}`);

        // Get bloat statistics after vacuum
        const bloatAfter = await this.getTableBloat();
        if (bloatAfter.length > 0) {
          console.log('\nBloat statistics after vacuum (top 10):');
          console.table(bloatAfter.slice(0, 10));
        }
      }

      console.log(`\nCompleted at: ${new Date().toISOString()}`);
      console.log('='.repeat(60));
    } catch (error) {
      console.error('Vacuum operation failed:', error);
      throw error;
    }
  }

  /**
   * Vacuum a specific table
   */
  private async vacuumTable(
    tableName: string,
    options: { full?: boolean; verbose?: boolean; analyze?: boolean }
  ): Promise<void> {
    const { full = false, verbose = false, analyze = true } = options;

    let command = 'VACUUM';
    if (full) command += ' FULL';
    if (verbose) command += ' VERBOSE';
    if (analyze) command += ' ANALYZE';
    command += ` ${tableName};`;

    await this.db.raw(command);
  }

  /**
   * Analyze all tables (update statistics)
   */
  async analyzeAll(): Promise<void> {
    console.log('='.repeat(60));
    console.log('ANALYZING ALL TABLES');
    console.log('='.repeat(60));

    const tables = await this.getUserTables();
    console.log(`Found ${tables.length} tables to analyze`);

    for (const tableName of tables) {
      try {
        await this.db.raw(`ANALYZE ${tableName};`);
        console.log(`✓ Analyzed '${tableName}'`);
      } catch (error: any) {
        console.error(`✗ Failed to analyze '${tableName}': ${error.message}`);
      }
    }

    console.log('='.repeat(60));
  }

  /**
   * Get vacuum statistics
   */
  async getVacuumStats(): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        schemaname,
        relname AS table_name,
        last_vacuum,
        last_autovacuum,
        vacuum_count,
        autovacuum_count,
        last_analyze,
        last_autoanalyze,
        analyze_count,
        autoanalyze_count
      FROM pg_stat_user_tables
      ORDER BY last_vacuum DESC NULLS LAST;
    `);

    return result.rows;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.destroy();
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: VacuumOptions = {};

  // Parse command line arguments
  args.forEach((arg) => {
    if (arg === '--full') options.full = true;
    if (arg === '--verbose') options.verbose = true;
    if (arg === '--no-analyze') options.analyze = false;
    if (arg.startsWith('--table=')) options.table = arg.split('=')[1];
  });

  const maintenance = new DatabaseMaintenance();

  try {
    // Show vacuum statistics before
    console.log('\nVacuum statistics (last 10 tables):');
    const statsBefore = await maintenance.getVacuumStats();
    console.table(statsBefore.slice(0, 10));

    // Perform vacuum
    await maintenance.vacuum(options);

    // Show vacuum statistics after
    console.log('\nVacuum statistics after operation (last 10 tables):');
    const statsAfter = await maintenance.getVacuumStats();
    console.table(statsAfter.slice(0, 10));
  } catch (error) {
    console.error('Maintenance script failed:', error);
    process.exit(1);
  } finally {
    await maintenance.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default DatabaseMaintenance;
