export async function downloadSupplierVendorOrders(secret:string, vendorId:string, orderCodes:string[],format:"txt"|"csv"="txt") {
  if (!vendorId) throw new Error("Choose the supplier vendor before downloading wholesale orders.");
  const response = await fetch("/api/admin/vendor-portal/export", {
    method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},
    body:JSON.stringify({vendorId,orderCodes,format}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Supplier export failed (HTTP ${response.status}). Please try again.`);
  if (!data || typeof data.text !== "string" || !data.text.trim() || typeof data.filename !== "string") {
    throw new Error("Unexpected supplier export response. No file was downloaded.");
  }
  const url=URL.createObjectURL(new Blob([data.text],{type:format==="csv"?"text/csv;charset=utf-8":"text/plain;charset=utf-8"}));
  const link=document.createElement("a"); link.href=url;link.download=data.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
