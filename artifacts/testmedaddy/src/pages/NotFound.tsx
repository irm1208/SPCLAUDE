import { Link } from "wouter";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="fade-in py-20 text-center">
      <p className="mono text-xs uppercase tracking-[0.25em] text-brand">404</p>
      <h1 className="mt-3 text-3xl font-bold">That page is not here.</h1>
      <p className="mt-2 text-muted">The link may be wrong, or the pool may have been removed.</p>
      <Link href="/"><Button className="mt-6">Back home</Button></Link>
    </div>
  );
}
