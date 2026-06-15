import React from "react";

export function SwissGrid() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#E5E4E2] font-['Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* Card Container */}
      <div className="w-full max-w-sm bg-[#F5F4F0] shadow-xl flex flex-col rounded-none overflow-hidden">
        {/* Top Bar */}
        <div className="bg-[#0F1F38] px-4 py-2.5 flex justify-between items-center text-white">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Group Buy</span>
          <div className="flex items-center gap-1.5">
            <div className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse shadow-[0_0_4px_#10B981]"></div>
            <span className="text-[10px] uppercase tracking-[0.1em] font-medium">Active</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 pt-6 pb-6 flex flex-col">
          {/* Title */}
          <h2 className="text-[#0F1F38] text-[28px] font-bold leading-[1.1] mb-4 tracking-[-0.02em]">
            Uther April Group Buy
          </h2>

          {/* Thick Rule */}
          <div className="h-[6px] w-full bg-[#0F1F38] mb-6"></div>

          {/* Data Grid */}
          <div className="flex flex-col border-t border-[#0F1F38]/10">
            <DataRow label="Manufacturer" value="Uther" />
            <DataRow label="Country" value="United Kingdom" />
            <DataRow label="Organiser" value="Admin" />
            <DataRow label="Closes" value="22 April · 8 days" />
            <DataRow label="Products" value="1" />
            <DataRow label="Currency" value="USD" />
          </div>

          {/* Info Snippet */}
          <p className="text-[12px] italic text-[#0F1F38]/60 mt-4 mb-6 leading-relaxed font-serif">
            Order will be made for peptides in stock
          </p>

          {/* CTA Button */}
          <button className="w-full bg-[#0F1F38] text-white py-3.5 text-[12px] font-bold tracking-[0.15em] uppercase rounded-sm hover:bg-[#1A2A45] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#0F1F38] outline-none active:scale-[0.98]">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-[#0F1F38]/10 py-3 items-baseline">
      <div className="w-[45%] text-[10px] uppercase tracking-[0.05em] font-bold text-[#0F1F38]/50">
        {label}
      </div>
      <div className="w-[55%] text-[14px] font-semibold text-[#0F1F38] tracking-tight">
        {value}
      </div>
    </div>
  );
}
