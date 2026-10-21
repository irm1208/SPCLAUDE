import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Server } from "node:http";
const calls = vi.hoisted(() => ({ admin: vi.fn(), organiser: vi.fn(), data: vi.fn() }));
vi.mock("../middleware/account-auth", () => ({ requireAccount: (req: any, res: any, next: any) => {
  if (req.headers["x-test-member"] !== "yes") return res.status(401).json({ error: "Sign in" });
  req.account = { telegramUsername: "member" }; next();
} }));
vi.mock("../lib/member-supplier-batches", () => ({ memberSupplierBatches: vi.fn(async (id, username) => ({ id, username, batches: [] })) }));
vi.mock("../middleware/require-admin", () => ({ requireAdmin: (req: any, res: any) => {
  calls.admin();
  if (req.headers["x-test-admin"] !== "yes") {res.status(401).json({error:"Admin authentication required"});return false;} return true;
} }));
vi.mock("../middleware/require-organiser", () => ({ requireOrganiser: (req: any,res:any,next:any) => {
  calls.organiser();
  if(req.headers["x-test-organiser"]!=="yes"){res.status(401).json({error:"Organiser authentication required"});return;}
  req.organiser={telegramUsername:"organiser",adminGbId:"gb"};next();
} }));
vi.mock("../lib/supplier-batches", () => ({
  supplierData:calls.data,saveSupplierConfig:vi.fn(),confirmSupplierBatch:vi.fn(),orderSupplierBatch:vi.fn(),
  releaseSupplierBatch:vi.fn(),reviewHistoricalSupplierOrder:vi.fn(),exportSupplierBatch:vi.fn(),
}));
import router from "./supplier-batches";
describe("supplier batch HTTP authentication", () => {
  it("requires member sign-in for the read-only batch summary and marks it private", async () => {
    expect((await fetch(`${base}/api/group-buys/gb/supplier-batches`)).status).toBe(401);
    const res = await fetch(`${base}/api/group-buys/gb/supplier-batches`, { headers: { "x-test-member": "yes" } });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ id: "gb", username: "member", batches: [] });
  });
  let server: Server, base: string;
  beforeAll(async()=>{
    const app=express();app.use(express.json());app.use("/api",router);
    server=app.listen(0,"127.0.0.1"); await new Promise<void>(r=>server.once("listening",r));
    base=`http://127.0.0.1:${(server.address() as any).port}`;
    calls.data.mockImplementation(async(id,actor)=>({id,actor}));
  });
  afterAll(()=>new Promise<void>((r,e)=>server.close(err=>err?e(err):r())));
  it("requires Admin auth under an Express mounted prefix, never falls through organiser auth",async()=>{
    calls.organiser.mockClear();
    const denied=await fetch(`${base}/api/admin/group-buys/gb/supplier-batches`);
    expect(denied.status).toBe(401);expect(calls.organiser).not.toHaveBeenCalled();
    const allowed=await fetch(`${base}/api/admin/group-buys/gb/supplier-batches`,{headers:{"x-test-admin":"yes"}});
    expect(allowed.status).toBe(200);expect((await allowed.json() as any).actor.admin).toBe(true);
    expect(allowed.headers.get("cache-control")).toBe("private, no-store");
  });
  it("requires organiser auth and preserves scoped identity",async()=>{
    expect((await fetch(`${base}/api/organiser/group-buys/gb/supplier-batches`)).status).toBe(401);
    const res=await fetch(`${base}/api/organiser/group-buys/gb/supplier-batches`,{headers:{"x-test-organiser":"yes"}});
    expect((await res.json() as any).actor).toMatchObject({username:"organiser",adminGbId:"gb"});
  });
});
