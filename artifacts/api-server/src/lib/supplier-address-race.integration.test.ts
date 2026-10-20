import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

// Authentication is the only boundary replaced: use the real account handler,
// real request-duration protection middleware and real PostgreSQL transactions.
vi.mock("../middleware/account-auth", async original => ({
  ...await original<typeof import("../middleware/account-auth")>(),
  requireAccount:(req:any,_res:any,next:any)=>{req.account={telegramUsername:"supplier-address-test"};next();},
}));
const gate=vi.hoisted(()=>({orderId:"",reached:null as null|(()=>void),resume:null as null|Promise<void>}));
vi.mock("./supplier-batch-protection", async original => {
  const actual=await original<typeof import("./supplier-batch-protection")>();
  return {...actual,assertSupplierOrderEditable:async(tx:any,ids:string[])=>{
    await actual.assertSupplierOrderEditable(tx,ids);
    if(ids.includes(gate.orderId)&&gate.resume){gate.reached?.();await gate.resume;}
  }};
});

describe.runIf(process.env.SUPPLIER_BATCH_DB_TESTS==="1")("account country edits versus supplier confirmation / PostgreSQL",()=>{
  let store:any, api:any, server:Server, base:string;
  const groups:string[]=[];
  const admin={username:"synthetic-admin",admin:true};
  beforeAll(async()=>{
    store=await import("@workspace/db");api=await import("./supplier-batches");
    const {halfKitProtection}=await import("../middleware/half-kit-protection");
    const {default:accountRouter}=await import("../routes/account");
    const app=express();app.use(express.json());app.use("/api",halfKitProtection);app.use("/api",accountRouter);
    app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status??500).json({error:err.message}));
    server=app.listen(0,"127.0.0.1");await new Promise<void>(r=>server.once("listening",r));
    base=`http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async()=>{
    gate.resume=null;
    await new Promise<void>(r=>server.close(()=>r()));
    for(const id of groups)await store.db.transaction(async(tx:any)=>{
      await tx.delete(store.telegramMessageLogsTable).where(sql`${store.telegramMessageLogsTable.eventKey} LIKE ${`supplier-ready:${id}:%`}`);
      await tx.delete(store.auditLogsTable).where(sql`${store.auditLogsTable.metadata}->>'groupBuyId' = ${id}`);
      await tx.delete(store.gbSupplierAllocationsTable).where(sql`${store.gbSupplierAllocationsTable.batchId} IN (SELECT id FROM gb_supplier_batches WHERE group_buy_id=${id})`);
      await tx.delete(store.ordersTable).where(eq(store.ordersTable.groupBuyId,id));
      await tx.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id,id));
    });
  });
  async function fixture(){
    const id=randomUUID(),orderId=randomUUID();groups.push(id);
    await store.db.insert(store.groupBuysTable).values({id,name:"Synthetic address concurrency test",status:"draft",currency:"USD",organiserId:"synthetic-organiser"});
    await store.db.insert(store.ordersTable).values({
      id:orderId,code:"address-race-test",telegramUsername:"supplier-address-test",deliveryMethod:"Synthetic",
      productSubtotal:"1000",grandTotal:"1000",groupBuyId:id,shippingCountry:"Italy",
      paymentStatus:"confirmed",paymentConfirmedAt:new Date("2026-01-01T00:00:00Z"),
    });
    await store.db.insert(store.orderLineItemsTable).values({
      id:randomUUID(),orderId,productId:"synthetic-product",productName:"Synthetic",quantity:"100",unitPrice:"10",lineTotal:"1000",
    });
    const data=await api.saveSupplierConfig(id,admin,{expectedVersion:0,config:{enabled:true,telegramAlerts:false,
      regions:[{id:"eu",name:"EU",countries:["IT"],targetKits:100}]}});
    return{id,orderId,token:data.proposals[0].token};
  }
  function edit(orderId:string){
    return fetch(`${base}/api/account/orders/${orderId}/shipping-address`,{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({shippingName:"Synthetic recipient",shippingAddress:"Synthetic address",shippingCountry:"United Kingdom"})});
  }
  it("holds the shared group mutex between the account allocation check and destination update",async()=>{
    const f=await fixture();
    gate.orderId=f.orderId;
    let resume!:()=>void, reached!:()=>void;
    gate.resume=new Promise<void>(r=>{resume=r;});
    const entered=new Promise<void>(r=>{reached=r;});gate.reached=reached;
    let pendingEdit:Promise<Response>|undefined;
    try{
      pendingEdit=edit(f.orderId);
      // Timeout is a failure guard, not an assumed scheduling delay.
      await Promise.race([entered,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error("Account allocation check was not reached")),5000);timer.unref();})]);
      const acquired=await store.db.transaction(async(tx:any)=>{
        const result=await tx.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${`half-kit-money:${f.id}`},0)) AS acquired`);
        return result.rows[0].acquired;
      });
      expect(acquired).toBe(false);
      const confirmation=api.confirmSupplierBatch(f.id,admin,{regionId:"eu",token:f.token})
        .then((data:any)=>({data,error:null}),(error:any)=>({data:null,error}));
      resume();
      expect((await pendingEdit).status).toBe(200);
      const result=await confirmation;
      expect(result.error?.status).toBe(409);
      const data=await api.supplierData(f.id,admin);
      expect(data.batches).toHaveLength(0);
      const [order]=await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.id,f.orderId));
      expect(order.shippingCountry).toBe("United Kingdom");
    }finally{resume();gate.resume=null;gate.orderId="";if(pendingEdit)await pendingEdit;}
  });
  it("rejects a later country edit when confirmation wins, leaving the allocation consistent",async()=>{
    const f=await fixture();
    const prepared=await api.confirmSupplierBatch(f.id,admin,{regionId:"eu",token:f.token});
    expect((await edit(f.orderId)).status).toBe(409);
    const [order]=await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.id,f.orderId));
    expect(order.shippingCountry).toBe("Italy");
    const data=await api.supplierData(f.id,admin);
    expect(data.batches[0].id).toBe(prepared.batches[0].id);
    expect(data.batches[0].exceptions).toEqual([]);
  });
});
