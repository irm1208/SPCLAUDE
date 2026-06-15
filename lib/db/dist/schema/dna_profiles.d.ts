export interface DnaVariantResult {
    rsid: string;
    gene: string;
    genotype: string;
    riskLevel: string;
    category: string;
    name: string;
}
export declare const dnaProfilesTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "dna_profiles";
    schema: undefined;
    columns: {
        accountId: import("drizzle-orm/pg-core").PgColumn<{
            name: "account_id";
            tableName: "dna_profiles";
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
        fileFormat: import("drizzle-orm/pg-core").PgColumn<{
            name: "file_format";
            tableName: "dna_profiles";
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
        snpCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "snp_count";
            tableName: "dna_profiles";
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
        findings: import("drizzle-orm/pg-core").PgColumn<{
            name: "findings";
            tableName: "dna_profiles";
            dataType: "json";
            columnType: "PgJsonb";
            data: DnaVariantResult[];
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: DnaVariantResult[];
        }>;
        uploadedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "uploaded_at";
            tableName: "dna_profiles";
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
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "dna_profiles";
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
//# sourceMappingURL=dna_profiles.d.ts.map