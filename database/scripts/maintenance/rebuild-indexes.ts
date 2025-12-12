#!/usr/bin/env ts-node
import { Knex } from 'knex';
import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Index Rebuild Script
 *
 * This script rebuilds database indexes to:
 * - Reduce index bloat
 * - Improve query performance
 * - Fix corrupted indexes
 * - Update index statistics
 *
 * Usage:
 *   npm run db:rebuild-indexes              # Rebuild all indexes
 *   npm run db:rebuild-indexes --table=users # Rebuild indexes for specific table
 *   npm run db:rebuild-indexes --concurrent  # Use CONCURRENTLY (no locks)
 */

interface RebuildOptions {
  concurrent?: boolean;
  table?: string;
  minSizeMB?: number;
}

class IndexMaintenance {
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
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
    });
  }

  /**
   * Get all indexes
   */
  async getAllIndexes(tableName?: string): Promise<any[]> {
    let query = `
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        idx_scan AS scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size,
        pg_relation_size(indexrelid) AS size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
    `;

    if (tableName) {
      query += ` AND tablename = '${tableName}'`;
    }

    query += ' ORDER BY pg_relation_size(indexrelid) DESC;';

    const result = await this.db.raw(query);
    return result.rows;
  }

  /**
   * Get bloated indexes
   */
  async getBloatedIndexes(minSizeMB: number = 1): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size,
        pg_relation_size(indexrelid) AS size_bytes,
        idx_scan AS scans
      FROM pg_stat_user_indexes
      WHERE pg_relation_size(indexrelid) > ${minSizeMB * 1024 * 1024}
        AND schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    return result.rows;
  }

  /**
   * Get index definitions
   */
  async getIndexDefinition(indexName: string): Promise<string> {
    const result = await this.db.raw(`
      SELECT pg_get_indexdef(indexrelid) AS definition
      FROM pg_stat_user_indexes
      WHERE indexname = '${indexName}';
    `);

    return result.rows[0]?.definition || '';
  }

  /**
   * Rebuild a single index
   */
  async rebuildIndex(indexName: string, concurrent: boolean = true): Promise<void> {
    const command = concurrent ? 'REINDEX INDEX CONCURRENTLY' : 'REINDEX INDEX';
    await this.db.raw(`${command} ${indexName};`);
  }

  /**
   * Rebuild all indexes for a table
   */
  async rebuildTableIndexes(tableName: string, concurrent: boolean = true): Promise<void> {
    const command = concurrent ? 'REINDEX TABLE CONCURRENTLY' : 'REINDEX TABLE';
    await this.db.raw(`${command} ${tableName};`);
  }

  /**
   * Rebuild all indexes
   */
  async rebuildAll(options: RebuildOptions = {}): Promise<void> {
    const { concurrent = true, table, minSizeMB = 0 } = options;

    console.log('='.repeat(60));
    console.log('INDEX REBUILD OPERATION');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Concurrent mode: ${concurrent}`);
    console.log(`Minimum size: ${minSizeMB}MB`);

    try {
      if (table) {
        // Rebuild specific table
        console.log(`Target table: ${table}`);
        console.log('-'.repeat(60));

        const indexes = await this.getAllIndexes(table);
        console.log(`\nFound ${indexes.length} indexes for table '${table}':`);
        console.table(indexes);

        const startTime = Date.now();
        await this.rebuildTableIndexes(table, concurrent);
        const duration = Date.now() - startTime;

        console.log(`\n✓ Rebuilt all indexes for '${table}' in ${duration}ms`);
      } else {
        // Rebuild all indexes
        const indexes = await this.getBloatedIndexes(minSizeMB);
        console.log(`\nFound ${indexes.length} indexes to rebuild:`);
        console.table(indexes.slice(0, 20));

        let successCount = 0;
        let failCount = 0;

        for (const index of indexes) {
          try {
            const startTime = Date.now();
            await this.rebuildIndex(index.index_name, concurrent);
            const duration = Date.now() - startTime;

            console.log(
              `✓ Rebuilt '${index.index_name}' (${index.size}, ${duration}ms)`
            );
            successCount++;
          } catch (error: any) {
            console.error(`✗ Failed to rebuild '${index.index_name}': ${error.message}`);
            failCount++;
          }
        }

        console.log('-'.repeat(60));
        console.log(`\nSummary:`);
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${failCount}`);
        console.log(`  Total: ${indexes.length}`);
      }

      console.log(`\nCompleted at: ${new Date().toISOString()}`);
      console.log('='.repeat(60));
    } catch (error) {
      console.error('Index rebuild operation failed:', error);
      throw error;
    }
  }

  /**
   * Identify unused indexes
   */
  async findUnusedIndexes(minSizeMB: number = 1): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        idx_scan AS scans,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size,
        pg_relation_size(indexrelid) AS size_bytes
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND schemaname = 'public'
        AND indexrelname NOT LIKE '%_pkey'
        AND pg_relation_size(indexrelid) > ${minSizeMB * 1024 * 1024}
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    return result.rows;
  }

  /**
   * Get duplicate indexes
   */
  async findDuplicateIndexes(): Promise<any[]> {
    const result = await this.db.raw(`
      SELECT
        pg_size_pretty(sum(pg_relation_size(idx))::bigint) AS size,
        (array_agg(idx))[1] AS idx1,
        (array_agg(idx))[2] AS idx2,
        (array_agg(idx))[3] AS idx3,
        (array_agg(idx))[4] AS idx4
      FROM (
        SELECT
          indexrelid::regclass AS idx,
          (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
           coalesce(indexprs::text,'')||E'\n' || coalesce(indpred::text,'')) AS key
        FROM pg_index
      ) sub
      GROUP BY key
      HAVING count(*) > 1
      ORDER BY sum(pg_relation_size(idx)) DESC;
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
  const options: RebuildOptions = { concurrent: true };

  // Parse command line arguments
  args.forEach((arg) => {
    if (arg === '--no-concurrent') options.concurrent = false;
    if (arg.startsWith('--table=')) options.table = arg.split('=')[1];
    if (arg.startsWith('--min-size=')) options.minSizeMB = parseInt(arg.split('=')[1]);
  });

  const maintenance = new IndexMaintenance();

  try {
    // Show index statistics before
    console.log('\nIndex statistics before rebuild:');
    const statsBefore = await maintenance.getAllIndexes(options.table);
    console.table(statsBefore.slice(0, 15));

    // Check for unused indexes
    console.log('\nChecking for unused indexes...');
    const unusedIndexes = await maintenance.findUnusedIndexes(5);
    if (unusedIndexes.length > 0) {
      console.log('\nUnused indexes found (consider removing):');
      console.table(unusedIndexes);
    } else {
      console.log('No unused indexes found.');
    }

    // Check for duplicate indexes
    console.log('\nChecking for duplicate indexes...');
    const duplicates = await maintenance.findDuplicateIndexes();
    if (duplicates.length > 0) {
      console.log('\nDuplicate indexes found (consider removing):');
      console.table(duplicates);
    } else {
      console.log('No duplicate indexes found.');
    }

    // Perform rebuild
    await maintenance.rebuildAll(options);

    // Show index statistics after
    console.log('\nIndex statistics after rebuild:');
    const statsAfter = await maintenance.getAllIndexes(options.table);
    console.table(statsAfter.slice(0, 15));
  } catch (error) {
    console.error('Index maintenance script failed:', error);
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

export default IndexMaintenance;
