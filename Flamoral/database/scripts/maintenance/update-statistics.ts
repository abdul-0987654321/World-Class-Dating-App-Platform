#!/usr/bin/env ts-node
import { Knex } from 'knex';
import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cron from 'node-cron';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Statistics Update Script
 *
 * This script updates PostgreSQL statistics to improve query planning.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   npm run db:update-stats              # Update statistics once
 *   npm run db:update-stats --schedule   # Schedule via cron
 *   npm run db:update-stats --table=users # Update specific table
 */

interface StatisticsOptions {
  table?: string;
  schedule?: boolean;
}

class StatisticsManager {
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
   * Get table statistics
   */
  async getTableStats(tableName?: string): Promise<any[]> {
    let query = `
      SELECT
        schemaname AS schema_name,
        relname AS table_name,
        n_live_tup AS live_tuples,
        n_dead_tup AS dead_tuples,
        n_mod_since_analyze AS modifications_since_analyze,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        vacuum_count,
        autovacuum_count,
        analyze_count,
        autoanalyze_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `;

    if (tableName) {
      query += ` AND relname = '${tableName}'`;
    }

    query += ' ORDER BY n_mod_since_analyze DESC, n_live_tup DESC;';

    const result = await this.db.raw(query);
    return result.rows;
  }

  /**
   * Get column statistics
   */
  async getColumnStats(tableName: string): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        attname AS column_name,
        n_distinct,
        correlation,
        null_frac,
        avg_width
      FROM pg_stats
      WHERE schemaname = 'public'
        AND tablename = '${tableName}'
      ORDER BY attname;
    `);

    return result.rows;
  }

  /**
   * Analyze a specific table
   */
  async analyzeTable(tableName: string, verbose: boolean = false): Promise<void> {
    const command = verbose ? `ANALYZE VERBOSE ${tableName};` : `ANALYZE ${tableName};`;
    await this.db.raw(command);
  }

  /**
   * Analyze all tables
   */
  async analyzeAll(verbose: boolean = false): Promise<void> {
    console.log('='.repeat(60));
    console.log('STATISTICS UPDATE OPERATION');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);

    const stats = await this.getTableStats();
    console.log(`\nFound ${stats.length} tables`);
    console.log('\nTables needing analysis (top 10 by modifications):');
    console.table(stats.slice(0, 10));

    let successCount = 0;
    let failCount = 0;

    for (const stat of stats) {
      try {
        const startTime = Date.now();
        await this.analyzeTable(stat.table_name, verbose);
        const duration = Date.now() - startTime;

        console.log(
          `✓ Analyzed '${stat.table_name}' (${stat.live_tuples} tuples, ${duration}ms)`
        );
        successCount++;
      } catch (error: any) {
        console.error(`✗ Failed to analyze '${stat.table_name}': ${error.message}`);
        failCount++;
      }
    }

    console.log('-'.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log(`  Total: ${stats.length}`);
    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
  }

  /**
   * Get query plan statistics
   */
  async getQueryPlanStats(): Promise<any> {
    const result = await this.db.raw(`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        stddev_time,
        rows,
        shared_blks_hit,
        shared_blks_read,
        shared_blks_dirtied,
        shared_blks_written
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_time DESC
      LIMIT 20;
    `);

    return result.rows;
  }

  /**
   * Reset query statistics
   */
  async resetQueryStats(): Promise<void> {
    await this.db.raw('SELECT pg_stat_statements_reset();');
    console.log('Query statistics reset');
  }

  /**
   * Get autovacuum settings
   */
  async getAutovacuumSettings(): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        name,
        setting,
        unit,
        category,
        short_desc
      FROM pg_settings
      WHERE name LIKE '%autovacuum%'
        OR name LIKE '%vacuum%'
      ORDER BY name;
    `);

    return result.rows;
  }

  /**
   * Schedule periodic statistics updates
   */
  scheduleUpdates(): void {
    console.log('='.repeat(60));
    console.log('SCHEDULING STATISTICS UPDATES');
    console.log('='.repeat(60));

    // Run ANALYZE every night at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log(`\n[${new Date().toISOString()}] Running scheduled statistics update...`);
      try {
        await this.analyzeAll(false);
      } catch (error) {
        console.error('Scheduled statistics update failed:', error);
      }
    });

    console.log('Scheduled: Daily ANALYZE at 2:00 AM');

    // Run ANALYZE on high-traffic tables every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log(
        `\n[${new Date().toISOString()}] Running statistics update for high-traffic tables...`
      );
      const highTrafficTables = [
        'users',
        'profiles',
        'swipes',
        'matches',
        'messages',
        'conversations',
      ];

      for (const table of highTrafficTables) {
        try {
          await this.analyzeTable(table, false);
          console.log(`✓ Analyzed '${table}'`);
        } catch (error: any) {
          console.error(`✗ Failed to analyze '${table}': ${error.message}`);
        }
      }
    });

    console.log('Scheduled: High-traffic tables ANALYZE every 6 hours');
    console.log('\nStatistics scheduler is running. Press Ctrl+C to stop.');
    console.log('='.repeat(60));
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
  const options: StatisticsOptions = {};

  // Parse command line arguments
  args.forEach((arg) => {
    if (arg === '--schedule') options.schedule = true;
    if (arg.startsWith('--table=')) options.table = arg.split('=')[1];
  });

  const manager = new StatisticsManager();

  try {
    if (options.schedule) {
      // Run scheduler
      manager.scheduleUpdates();

      // Keep process running
      process.on('SIGINT', async () => {
        console.log('\nShutting down scheduler...');
        await manager.close();
        process.exit(0);
      });
    } else {
      // Single run
      console.log('\nCurrent statistics (before update):');
      const statsBefore = await manager.getTableStats(options.table);
      console.table(statsBefore.slice(0, 10));

      // Show autovacuum settings
      console.log('\nAutovacuum settings:');
      const settings = await manager.getAutovacuumSettings();
      console.table(settings);

      if (options.table) {
        // Analyze specific table
        console.log(`\nAnalyzing table: ${options.table}`);
        await manager.analyzeTable(options.table, true);

        // Show column statistics
        console.log(`\nColumn statistics for '${options.table}':`);
        const colStats = await manager.getColumnStats(options.table);
        console.table(colStats);
      } else {
        // Analyze all tables
        await manager.analyzeAll(false);
      }

      console.log('\nStatistics after update:');
      const statsAfter = await manager.getTableStats(options.table);
      console.table(statsAfter.slice(0, 10));

      await manager.close();
    }
  } catch (error) {
    console.error('Statistics management script failed:', error);
    await manager.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default StatisticsManager;
