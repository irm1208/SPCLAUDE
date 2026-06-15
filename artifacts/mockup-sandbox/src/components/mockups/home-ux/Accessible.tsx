import React from "react";
import { 
  ArrowRight, 
  FlaskConical, 
  User, 
  ShoppingCart, 
  ClipboardList, 
  Layers, 
  Link as LinkIcon, 
  PenTool, 
  GraduationCap, 
  ShieldCheck, 
  Hash,
  ChevronRight,
  Menu,
  CheckCircle2,
  Info
} from "lucide-react";

// --- Components ---

function Button({ 
  children, 
  variant = "primary", 
  size = "default", 
  className = "",
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "large" | "small";
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a6e] focus-visible:ring-offset-2";
  
  const variants = {
    primary: "bg-[#1e3a6e] text-white hover:bg-[#152950]",
    secondary: "bg-[#e5e7eb] text-[#1a1a2e] hover:bg-[#d1d5db]",
    outline: "border-2 border-[#1e3a6e] text-[#1e3a6e] hover:bg-[#f3f4f6]",
    ghost: "text-[#1e3a6e] hover:bg-[#f3f4f6]",
  };
  
  const sizes = {
    default: "h-[44px] px-6 text-[16px]",
    large: "h-[56px] px-8 text-[18px]",
    small: "h-[36px] px-4 text-[14px]", // Exception for small in-card buttons, though accessible guidelines suggest 44px min touch target. We'll use 44px even for small to be strictly accessible.
  };

  // Enforce 44px min height for all buttons for accessibility
  const accessibleSizes = {
    default: "min-h-[44px] px-6 text-[16px]",
    large: "min-h-[56px] px-8 text-[18px]",
    small: "min-h-[44px] px-4 text-[16px]", // Overridden to be accessible
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${accessibleSizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function AccessibleBadge() {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm border-2 border-[#1e3a6e]">
      <div className="flex flex-col">
        <span className="text-[12px] font-bold text-[#1a1a2e] uppercase tracking-wider">WCAG AAA</span>
        <span className="text-[14px] font-medium text-[#1e3a6e]">Contrast: 14.5:1</span>
      </div>
      <CheckCircle2 className="w-6 h-6 text-green-700" />
    </div>
  );
}

// --- Main Layout ---

export function Accessible() {
  return (
    <div className="flex min-h-screen bg-[#fafafa] text-[#1a1a2e] font-sans selection:bg-[#1e3a6e] selection:text-white">
      
      {/* Sidebar - Wide enough for text labels, clear contrast */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r-2 border-gray-200 p-6 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#1e3a6e] rounded-md flex items-center justify-center shrink-0">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <span className="text-[20px] font-bold tracking-tight text-[#1a1a2e] leading-tight">PEPS<br/>ANONYMOUS</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <div className="text-[14px] font-bold text-[#1a1a2e] uppercase tracking-widest mb-2 mt-4">Main Menu</div>
          
          <a href="#" className="flex items-center gap-4 p-3 rounded-md bg-[#f3f4f6] text-[#1e3a6e] font-bold border-l-4 border-[#1e3a6e]">
            <Layers className="w-6 h-6" />
            <span className="text-[16px]">Group Buys</span>
          </a>
          <a href="#" className="flex items-center gap-4 p-3 rounded-md hover:bg-[#f3f4f6] text-[#1a1a2e] font-medium transition-colors">
            <FlaskConical className="w-6 h-6" />
            <span className="text-[16px]">Testing Pools</span>
          </a>
          <a href="#" className="flex items-center gap-4 p-3 rounded-md hover:bg-[#f3f4f6] text-[#1a1a2e] font-medium transition-colors">
            <ShoppingCart className="w-6 h-6" />
            <span className="text-[16px]">Single Vials</span>
          </a>
          <a href="#" className="flex items-center gap-4 p-3 rounded-md hover:bg-[#f3f4f6] text-[#1a1a2e] font-medium transition-colors">
            <ClipboardList className="w-6 h-6" />
            <span className="text-[16px]">Lab Results</span>
          </a>
          
          <div className="text-[14px] font-bold text-[#1a1a2e] uppercase tracking-widest mb-2 mt-8">Account</div>
          <a href="#" className="flex items-center gap-4 p-3 rounded-md hover:bg-[#f3f4f6] text-[#1a1a2e] font-medium transition-colors">
            <User className="w-6 h-6" />
            <span className="text-[16px]">Sign In / Register</span>
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1000px] mx-auto p-6 md:p-12 lg:p-16 relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a6e] rounded-md flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <span className="text-[20px] font-bold tracking-tight text-[#1a1a2e]">PEPS ANONYMOUS</span>
          </div>
          <button className="p-3 bg-gray-200 rounded-md text-[#1a1a2e] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Menu className="w-6 h-6" />
            <span className="sr-only">Open Menu</span>
          </button>
        </div>

        {/* Accessibility Annotation */}
        <AccessibleBadge />

        {/* Hero Section */}
        <section className="mb-24 mt-8 md:mt-16 max-w-3xl">
          <div className="inline-block px-4 py-2 bg-[#e5e7eb] text-[#1a1a2e] font-bold text-[16px] rounded-md mb-8 tracking-wide border border-gray-300">
            CURRENT STATUS: TAKING ORDERS
          </div>
          
          <h1 className="text-[40px] md:text-[56px] font-extrabold text-[#1a1a2e] leading-[1.1] mb-8 tracking-tight">
            Join the next group buy.
          </h1>
          
          <p className="text-[20px] md:text-[24px] text-[#1a1a2e] leading-[1.6] mb-12 max-w-2xl font-medium">
            Member-only pricing on bulk peptide orders. High purity, independent lab testing. Pay securely in USDT.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="large" className="w-full sm:w-auto shadow-md">
              View active group buys
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <Button variant="outline" size="large" className="w-full sm:w-auto bg-white">
              Learn how it works
            </Button>
          </div>
        </section>

        {/* Progressive Disclosure Divider */}
        <div className="flex items-center gap-6 mb-16">
          <h2 className="text-[24px] font-bold text-[#1a1a2e] whitespace-nowrap">What else is available?</h2>
          <div className="h-1 flex-1 bg-gray-200 rounded-full"></div>
        </div>

        {/* Secondary Actions Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          
          {/* Testing Pools Card - High Contrast */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-[#f0f4f8] text-[#1e3a6e] rounded-lg flex items-center justify-center shrink-0 border border-[#dbe4ef]">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[22px] font-bold text-[#1a1a2e] mb-2 leading-tight">Community Testing Pools</h3>
                <p className="text-[18px] text-[#1a1a2e] leading-snug">Fund independent blind lab tests.</p>
              </div>
            </div>
            
            <div className="bg-[#e5e7eb] p-4 rounded-lg mb-8 border border-gray-300">
              <div className="flex items-center gap-3">
                <Info className="w-6 h-6 text-[#1e3a6e]" />
                <span className="text-[16px] font-bold text-[#1a1a2e]">1 pool currently open for contributions</span>
              </div>
            </div>
            
            <div className="mt-auto">
              <Button variant="secondary" className="w-full justify-between group border border-gray-300">
                <span>View testing pools</span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Educational / Trust Card instead of just pushing vials */}
          <div className="bg-[#1e3a6e] text-white border-2 border-[#1e3a6e] rounded-xl p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 text-white rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[22px] font-bold text-white mb-2 leading-tight">Verified Results</h3>
                <p className="text-[18px] text-blue-100 leading-snug">Every batch tested by Janoshik.</p>
              </div>
            </div>
            
            <p className="text-[18px] text-blue-50 leading-[1.6] mb-8 font-medium">
              We never ship without an independent Certificate of Analysis. Review past test results in our public database.
            </p>
            
            <div className="mt-auto">
              <Button variant="outline" className="w-full justify-between bg-transparent border-white text-white hover:bg-white/10 hover:text-white">
                <span>Browse COA Database</span>
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

        </div>

        {/* Single Vials Section - Highly Readable Cards */}
        <section className="mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-[32px] font-bold text-[#1a1a2e] mb-3">Single vials in stock</h2>
              <p className="text-[18px] text-[#1a1a2e] max-w-xl font-medium">
                Try a compound before committing to a full kit. Ships within 24 hours.
              </p>
            </div>
            <Button variant="ghost" className="shrink-0 font-bold text-[18px] border-2 border-transparent hover:border-gray-200">
              Browse all vials <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Cards Grid - Not a tiny horizontal scroll */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {[
              { name: "Retatrutide", dose: "10mg", price: "$35.00", inStock: true },
              { name: "Tirzepatide", dose: "30mg", price: "$45.00", inStock: true },
              { name: "BPC-157", dose: "5mg", price: "$15.00", inStock: false },
            ].map((product, idx) => (
              <div key={idx} className="bg-white border-2 border-gray-300 rounded-xl p-6 flex flex-col relative focus-within:ring-4 focus-within:ring-[#1e3a6e] focus-within:border-[#1e3a6e] transition-all">
                
                {/* Semantic structural linking for accessibility */}
                <a href="#" className="absolute inset-0 z-10" aria-label={`View details for ${product.name} ${product.dose}`}>
                  <span className="sr-only">View product</span>
                </a>

                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#f3f4f6] text-[#1a1a2e] text-[14px] font-bold px-3 py-1.5 rounded-md border border-gray-300">
                    Vial
                  </div>
                  {product.inStock ? (
                    <div className="text-green-800 font-bold text-[14px] bg-green-100 px-3 py-1.5 rounded-md border border-green-300">
                      In Stock
                    </div>
                  ) : (
                    <div className="text-red-800 font-bold text-[14px] bg-red-100 px-3 py-1.5 rounded-md border border-red-300">
                      Sold Out
                    </div>
                  )}
                </div>

                <h3 className="text-[24px] font-bold text-[#1a1a2e] mb-1">{product.name}</h3>
                <div className="text-[18px] text-[#1a1a2e] mb-6 font-medium">{product.dose}</div>
                
                <div className="mt-auto flex items-center justify-between pt-6 border-t-2 border-gray-100">
                  <div className="text-[22px] font-extrabold text-[#1a1a2e]">{product.price}</div>
                  
                  {/* The button uses relative z-index to sit above the full-card link */}
                  <Button 
                    size="small" 
                    variant={product.inStock ? "primary" : "secondary"} 
                    className="relative z-20"
                    disabled={!product.inStock}
                  >
                    {product.inStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            ))}
            
          </div>
        </section>

      </main>
    </div>
  );
}
