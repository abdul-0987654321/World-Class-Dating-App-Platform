import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // GDPR Article 33/34 - Data Breach Incidents
  await knex.schema.createTable("data_breach_incidents", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.string("breach_id").unique().notNullable();
    t.enum("breach_type", ["unauthorized_access", "data_loss", "data_exposure", "ransomware", "other"]).notNullable();
    t.enum("severity", ["low", "medium", "high", "critical"]).notNullable();
    t.text("description").notNullable();
    t.jsonb("data_categories_affected").notNullable();
    t.integer("estimated_affected_users").defaultTo(0);
    t.timestamp("discovered_at").notNullable();
    t.timestamp("occurred_at");
    t.timestamp("reported_to_authority_at");
    t.timestamp("users_notified_at");
    t.text("containment_actions");
    t.text("remediation_steps");
    t.enum("status", ["detected", "investigating", "contained", "notifying", "resolved"]).defaultTo("detected");
    t.string("reported_by").notNullable();
    t.boolean("dpo_notified").defaultTo(false);
    t.timestamps(true, true);
  });

  // Breach user notifications tracking
  await knex.schema.createTable("breach_user_notifications", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.string("breach_id").references("breach_id").inTable("data_breach_incidents").onDelete("CASCADE");
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.timestamp("notified_at").notNullable();
    t.string("notification_channel").defaultTo("email");
    t.string("status").defaultTo("sent");
    t.index(["breach_id", "user_id"]);
  });

  // GDPR Article 16 - Rectification requests
  await knex.schema.createTable("gdpr_rectification_requests", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.jsonb("corrections").notNullable();
    t.string("status").defaultTo("pending");
    t.timestamp("requested_at").notNullable();
    t.string("ip_address");
    t.text("user_agent");
    t.timestamps(true, true);
    t.index("user_id");
  });

  // GDPR Article 21 - Processing objections
  await knex.schema.createTable("gdpr_processing_objections", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.string("processing_type").notNullable();
    t.text("reason");
    t.string("status").defaultTo("active");
    t.timestamp("objected_at").notNullable();
    t.string("ip_address");
    t.text("user_agent");
    t.timestamps(true, true);
    t.index("user_id");
  });

  // GDPR Article 18 - Processing restrictions
  await knex.schema.createTable("gdpr_processing_restrictions", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.string("reason").notNullable();
    t.string("status").defaultTo("active");
    t.timestamp("restricted_at").notNullable();
    t.timestamp("lifted_at");
    t.string("ip_address");
    t.text("user_agent");
    t.timestamps(true, true);
    t.index("user_id");
  });

  // Add processing restriction columns to users table
  await knex.schema.alterTable("users", (t) => {
    t.boolean("processing_restricted").defaultTo(false);
    t.timestamp("processing_restricted_at");
    t.string("processing_restricted_reason");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("processing_restricted");
    t.dropColumn("processing_restricted_at");
    t.dropColumn("processing_restricted_reason");
  });
  await knex.schema.dropTableIfExists("gdpr_processing_restrictions");
  await knex.schema.dropTableIfExists("gdpr_processing_objections");
  await knex.schema.dropTableIfExists("gdpr_rectification_requests");
  await knex.schema.dropTableIfExists("breach_user_notifications");
  await knex.schema.dropTableIfExists("data_breach_incidents");
}
