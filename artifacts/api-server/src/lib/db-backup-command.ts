export function buildPgDumpArgs(dbUrl: string): string[] {
  return ["--no-owner", "--no-privileges", dbUrl];
}