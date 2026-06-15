import React from "react";
import { ArrowRight } from "lucide-react";

export function NewspaperCard() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#E5DFC8" }}
    >
      <div
        className="w-full max-w-md relative p-4 pb-6 shadow-sm overflow-hidden"
        style={{
          backgroundColor: "#F2EDD7",
          fontFamily: "Georgia, serif",
          color: "#111",
        }}
      >
        {/* Rubber Stamp */}
        <div
          className="absolute top-16 right-6 border-4 border-red-600 text-red-600 px-3 py-1 font-bold text-xl uppercase tracking-widest rounded-sm opacity-80 mix-blend-multiply pointer-events-none select-none z-10"
          style={{ transform: "rotate(-12deg)", fontFamily: "Courier New, monospace" }}
        >
          Active
        </div>

        {/* Header Bar */}
        <div className="border-t-8 border-b border-black py-1 mb-4 flex justify-between items-center text-[10px] tracking-widest font-bold uppercase">
          <span>The Peptide Gazette</span>
          <span>Issue 042 &middot; Classifieds</span>
        </div>

        {/* Headline */}
        <h1
          className="text-4xl leading-none mb-3 uppercase"
          style={{ fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Uther April Group Buy
        </h1>

        <hr className="border-black mb-4" />

        {/* Body Text Columns */}
        <div className="columns-2 gap-4 text-[11px] leading-relaxed mb-6 text-justify">
          <p className="mb-2">
            <span className="font-bold uppercase text-[13px] float-left text-3xl leading-none pr-1 mt-[-2px]">
              T
            </span>
            he compound, manufactured by <strong>Uther</strong> of the United
            Kingdom, is currently accepting orders from discerning buyers. Our
            local organiser, known to the community as <strong>Admin</strong>,
            has confirmed that this rare opportunity will remain available for a
            strictly limited time.
          </p>
          <p className="mb-2">
            Interested parties are advised to act post-haste, as the ledger
            officially closes on <strong>April 22nd</strong>. At the time of
            printing, a mere <strong>8 days remain</strong> for submissions to be
            recorded.
          </p>
          <p className="mb-2">
            Offerings include <strong>1 premium product</strong> line, with all
            transactions to be settled in United States Dollars (<strong>USD</strong>
            ).
          </p>
          <p className="italic border-l-2 border-black pl-2 ml-1 my-2">
            "Order will be made for peptides in stock."
          </p>
          <p>
            Do not let this momentous offering pass you by. Enquire within using
            the mechanism provided below.
          </p>
        </div>

        {/* Footer / CTA */}
        <div className="border-t border-black pt-4 flex justify-between items-end">
          <div className="text-[10px] uppercase tracking-wider font-bold">
            Ref: UK-UTH-0422
          </div>
          <button className="bg-black hover:bg-gray-800 text-white px-6 py-2 text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-colors">
            Buy Now <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
