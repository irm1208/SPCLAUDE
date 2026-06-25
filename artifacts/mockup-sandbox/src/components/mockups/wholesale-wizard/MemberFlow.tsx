import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Copy, 
  Package, DollarSign, Clock, Users, ShieldCheck, 
  MapPin, AlertCircle, Sparkles, Check
} from 'lucide-react';

export function MemberFlow() {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [tip, setTip] = useState(0);

  const products = [
    { id: 'p1', name: 'Semaglutide 5mg', price: 42, desc: 'Metabolic focus' },
    { id: 'p2', name: 'BPC-157 5mg', price: 38, desc: 'Recovery' },
    { id: 'p3', name: 'Retatrutide 10mg', price: 65, desc: 'Advanced compound' },
  ];

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const subtotal = products.reduce((acc, p) => acc + (quantities[p.id] || 0) * p.price, 0) + tip;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps + 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="w-[390px] h-[844px] bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col font-sans relative text-slate-800">
      
      {/* Header & Progress */}
      {step <= totalSteps && (
        <div className="pt-12 pb-4 px-6 bg-white shrink-0 z-10 relative">
          <div className="flex items-center justify-between mb-6">
            {step > 1 ? (
              <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9"></div>
            )}
            <span className="text-sm font-medium tracking-wide text-slate-400 uppercase">Step {step} of {totalSteps}</span>
            <div className="w-9"></div>
          </div>
          
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 relative">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">You're in!</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              You've joined <span className="font-semibold text-slate-800">@alex's</span> shared order. 
              Everyone adds what they want, the organiser combines it into one bulk order, then you each pay your own share.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
              <p className="text-sm text-slate-500 mb-1 font-medium">Group Code</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono tracking-widest font-bold text-slate-800">AX-992-B</span>
                <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600 bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
              <Users className="w-5 h-5 text-blue-500" />
              <span>3 people have joined so far</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Add your items</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Pick the products you want and an optional tip, then save your items.
            </p>

            <div className="space-y-4 mb-8">
              {products.map(p => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{p.name}</h3>
                    <p className="text-slate-500 text-sm">${p.price} • {p.desc}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-100">
                    <button 
                      onClick={() => updateQty(p.id, -1)}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-medium">{quantities[p.id] || 0}</span>
                    <button 
                      onClick={() => updateQty(p.id, 1)}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium text-slate-800">Add a tip for the organiser?</p>
              </div>
              <div className="flex gap-2">
                {[0, 2, 5, 10].map(amount => (
                  <button 
                    key={amount}
                    onClick={() => setTip(amount)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      tip === amount 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {amount === 0 ? 'None' : `$${amount}`}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 mt-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-8 shadow-sm relative">
              <div className="absolute inset-0 border-4 border-amber-100 rounded-full animate-pulse"></div>
              <Clock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-4">Hang tight</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-10 px-4">
              Your items are in. Now the organiser waits for everyone, then locks the order. You'll get your own order to pay once that happens.
            </p>

            <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              <p className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-2">Group Progress</p>
              <h3 className="text-xl font-medium text-slate-800 mb-4">3 of 4 members have added items</h3>
              
              <div className="flex gap-2">
                <div className="h-2 flex-1 bg-green-500 rounded-full"></div>
                <div className="h-2 flex-1 bg-green-500 rounded-full"></div>
                <div className="h-2 flex-1 bg-green-500 rounded-full"></div>
                <div className="h-2 flex-1 bg-slate-200 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Pay your share</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              The order's locked in. Pay your own order to confirm your spot. Once everyone pays, the parcel ships automatically.
            </p>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
              <h3 className="text-center text-slate-500 font-medium mb-2">Amount Due</h3>
              <div className="text-center text-5xl font-bold text-slate-900 mb-8 tracking-tight">
                ${subtotal > 0 ? subtotal + 12 : 96}
              </div>

              <div className="space-y-3 text-slate-600">
                <div className="flex justify-between">
                  <span>Product Subtotal</span>
                  <span className="font-medium text-slate-900">${subtotal > 0 ? subtotal : 84}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your shipping share</span>
                  <span className="font-medium text-slate-900">$12</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between">
                    <span>Organiser Tip</span>
                    <span className="font-medium text-slate-900">${tip}</span>
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${subtotal > 0 ? subtotal + 12 : 96}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Anything extra</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              If there's an organiser fee or onward-shipping fee, you pay it directly to the person shown here — it's separate from your order.
            </p>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  A
                </div>
                <div>
                  <p className="font-medium text-slate-900">@alex</p>
                  <p className="text-sm text-slate-500">Organiser & Recipient</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-slate-900">Onward Shipping</p>
                    <p className="text-sm text-slate-500">Domestic postage</p>
                  </div>
                  <span className="font-semibold text-slate-900">$8.50</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Organiser Tip Paid</span>
                  </div>
                  <span className="font-semibold text-green-700">${tip > 0 ? tip : 5}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-medium text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  Mark as Paid to @alex
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-in fade-in zoom-in duration-500 h-full flex flex-col items-center justify-center mt-20">
            <div className="w-24 h-24 bg-blue-500 text-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-blue-500/30">
              <Check className="w-12 h-12 stroke-[3]" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-4 text-center">All done</h1>
            <p className="text-slate-600 leading-relaxed text-lg text-center px-6">
              You're all settled up. We'll let you know when the parcel ships.
            </p>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      {step <= totalSteps && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
          <div className="flex items-center justify-between">
            {step === 2 && subtotal > 0 && (
              <div className="font-medium text-slate-900">
                Total: <span className="text-xl font-bold ml-1">${subtotal}</span>
              </div>
            )}
            
            <button 
              onClick={nextStep}
              className={`ml-auto py-4 px-8 rounded-2xl font-medium text-lg flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                step === 4 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
              }`}
            >
              {step === 2 ? 'Save items' : step === 3 ? 'Continue' : step === 4 ? 'Pay Now' : step === 5 ? 'Done' : 'Continue'}
              {step !== 4 && step !== 5 && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
