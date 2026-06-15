export type Fs3BatchSheetProduct = {
    name: string;
    qty: number;
    unitCost: number | null;
};
export type Fs3BatchSheet = {
    route: string;
    label: string;
    type: string;
    orderCount: number;
    products: Fs3BatchSheetProduct[];
};
/**
 * Records each FS3 vendor-order batch submission.
 * Written by the fs3-submit endpoint; read by the batch history panel.
 * batchSnapshot stores the full per-route product breakdown for history regeneration.
 */
export declare const fs3SubmissionsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "fs3_submissions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        gbId: import("drizzle-orm/pg-core").PgColumn<{
            name: "gb_id";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        submittedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "submitted_by";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        totalOrders: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_orders";
            tableName: "fs3_submissions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        processedCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "processed_count";
            tableName: "fs3_submissions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        includeUnconfirmed: import("drizzle-orm/pg-core").PgColumn<{
            name: "include_unconfirmed";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sheets: import("drizzle-orm/pg-core").PgColumn<{
            name: "sheets";
            tableName: "fs3_submissions";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                label: string;
                type: string;
                orderCount: number;
            }[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
                label: string;
                type: string;
                orderCount: number;
            }[];
        }>;
        batchSnapshot: import("drizzle-orm/pg-core").PgColumn<{
            name: "batch_snapshot";
            tableName: "fs3_submissions";
            dataType: "json";
            columnType: "PgJsonb";
            data: Fs3BatchSheet[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Fs3BatchSheet[];
        }>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "fs3_submissions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "fs3_submissions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type Fs3Submission = typeof fs3SubmissionsTable.$inferSelect;
export type NewFs3Submission = typeof fs3SubmissionsTable.$inferInsert;
//# sourceMappingURL=fs3_submissions.d.ts.map