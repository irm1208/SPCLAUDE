// Test fixture only. Production schema changes are owned by managed Publish,
// never imported/applied by application startup or its build.
export const schemaDDL = `
CREATE TABLE tmd_users (
 id text PRIMARY KEY, email text NOT NULL, handle text NOT NULL, password_hash text NOT NULL,
 display_name text NOT NULL, bio text, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tmd_users_email_unique UNIQUE(email), CONSTRAINT tmd_users_handle_unique UNIQUE(handle)
);
CREATE TABLE tmd_sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL, csrf_token text NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tmd_sessions_user_id_fkey FOREIGN KEY(user_id) REFERENCES tmd_users(id) ON DELETE CASCADE
);
CREATE INDEX tmd_sessions_user_idx ON tmd_sessions(user_id);
CREATE TABLE tmd_pools (
 id text PRIMARY KEY, slug text NOT NULL, organiser_id text NOT NULL, status text NOT NULL DEFAULT 'draft',
 visibility text NOT NULL DEFAULT 'public', access_code_hash text, document jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tmd_pools_slug_unique UNIQUE(slug),
 CONSTRAINT tmd_pools_organiser_id_fkey FOREIGN KEY(organiser_id) REFERENCES tmd_users(id)
);
CREATE INDEX tmd_pools_organiser_idx ON tmd_pools(organiser_id);
CREATE TABLE tmd_members (
 id text PRIMARY KEY, pool_id text NOT NULL, user_id text NOT NULL, display_name text NOT NULL,
 anonymous boolean NOT NULL DEFAULT false, amount_usd numeric(12,2) NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tmd_members_pool_id_fkey FOREIGN KEY(pool_id) REFERENCES tmd_pools(id) ON DELETE CASCADE,
 CONSTRAINT tmd_members_user_id_fkey FOREIGN KEY(user_id) REFERENCES tmd_users(id),
 CONSTRAINT tmd_members_pool_user_unique UNIQUE(pool_id,user_id)
);
CREATE INDEX tmd_members_user_idx ON tmd_members(user_id);
`;
