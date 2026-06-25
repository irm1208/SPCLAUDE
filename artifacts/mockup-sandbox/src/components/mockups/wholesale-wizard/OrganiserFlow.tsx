import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, Copy, Package, 
  Users, MapPin, Check, ShieldCheck, CheckSquare, Settings2, Plus, DollarSign
} from 'lucide-react';

export function OrganiserFlow() {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [forwarding, setForwarding] = useState(false);

  const products = [
    { id: 'p1', name: 'Semaglutide 5mg', price: 42, desc: 'Metabolic focus' },
    { id: 'p2', name: 'BPC-157 5mg', price: 38, desc: 'Recovery' },
    { id: 'p3', name: 'TB-500 5mg', price: 45, desc: 'Healing' },
  ];

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const subtotal = products.reduce((acc, p) => acc + (quantities[p.id] || 0) * p.price, 0);

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
              className="h-full bg-indigo-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 relative">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Add your items</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Like everyone else, you order for yourself first. Pick your products and save.
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
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Invite people</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Share your code or invite link so others can join. You need at least 2 people to lock the order.
            </p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-sm font-medium text-indigo-600 mb-2 uppercase tracking-wide">Your Group Code</p>
              <div className="text-4xl font-mono font-bold text-indigo-950 mb-6 tracking-widest">
                AX-992-B
              </div>
              <button className="w-full py-3.5 bg-white border border-indigo-100 rounded-2xl font-medium text-indigo-600 flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm">
                <Copy className="w-5 h-5" />
                Copy Invite Link
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-slate-900">Joined so far</h3>
                <span className="text-sm font-medium text-slate-500">2 members</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">A</div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">@alex <span className="text-slate-400 font-normal">(You)</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">S</div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">@sam</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Parcel Recipient</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Choose one member to receive the combined parcel. They'll confirm the delivery address next.
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-4 bg-indigo-50 border-2 border-indigo-500 p-4 rounded-2xl cursor-pointer">
                <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center font-bold">A</div>
                <div className="flex-1">
                  <p className="font-medium text-indigo-950">@alex <span className="text-indigo-600/70 font-normal">(You)</span></p>
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </label>
              
              <label className="flex items-center gap-4 bg-white border-2 border-slate-200 p-4 rounded-2xl cursor-pointer hover:border-slate-300">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">S</div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">@sam</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-slate-300"></div>
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Delivery address</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Whoever receives the parcel confirms where it goes. Since that's you, fill it in here.
            </p>

            <div className="space-y-4 mb-8">
              <input type="text" placeholder="Full Name" defaultValue="Alex Smith" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg font-medium" />
              <input type="text" placeholder="Street Address" defaultValue="123 Coastal Way" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg" />
              <div className="flex gap-4">
                <input type="text" placeholder="City" defaultValue="Sydney" className="w-2/3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg" />
                <input type="text" placeholder="Postcode" defaultValue="2000" className="w-1/3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg" />
              </div>
              <select className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg appearance-none">
                <option>Australia</option>
                <option>United States</option>
                <option>United Kingdom</option>
              </select>
            </div>

            <div className={`p-5 rounded-2xl border transition-colors ${forwarding ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <button 
                    onClick={() => setForwarding(!forwarding)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${forwarding ? 'bg-indigo-500 text-white' : 'bg-slate-100 border border-slate-300'}`}
                  >
                    {forwarding && <Check className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Set up forwarding? (Optional)</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Posting each person's items onward to them yourself? Tick this. Most groups skip this and meet up.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Lock & Create</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              When everyone's added items and the address is set, lock the order. Items freeze and each member gets their own order to pay.
            </p>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
              <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-5">Readiness Checklist</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-800 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  At least 2 members joined
                </div>
                <div className="flex items-center gap-3 text-slate-800 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  Everyone added items
                </div>
                <div className="flex items-center gap-3 text-slate-800 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  Recipient + address set
                </div>
                <div className="flex items-center gap-3 text-slate-800 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  Shippable destination
                </div>
              </div>
            </div>

            <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm font-medium flex gap-3">
               <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600" />
               <p>Locking cannot be undone. Make sure everyone is happy with their items.</p>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Pay your share</h1>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Pay your own order like everyone else. Once everyone's paid, the parcel ships to the vendor automatically.
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
                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${subtotal > 0 ? subtotal + 12 : 96}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="animate-in fade-in zoom-in duration-500 h-full flex flex-col items-center justify-center mt-20">
            <div className="w-24 h-24 bg-indigo-500 text-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/30">
              <Check className="w-12 h-12 stroke-[3]" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-4 text-center">All done</h1>
            <p className="text-slate-600 leading-relaxed text-lg text-center px-6">
              You've paid your share. Once everyone else pays, the order will automatically be sent to the vendor.
            </p>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      {step <= totalSteps && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
          <div className="flex items-center justify-between">
            {step === 1 && subtotal > 0 && (
              <div className="font-medium text-slate-900">
                Total: <span className="text-xl font-bold ml-1">${subtotal}</span>
              </div>
            )}
            
            <button 
              onClick={nextStep}
              className={`ml-auto py-4 px-8 rounded-2xl font-medium text-lg flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                step === 6 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' 
                  : step === 5 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'
              }`}
            >
              {step === 1 ? 'Save items' : 
               step === 4 ? 'Confirm Address' : 
               step === 5 ? 'Lock Order' : 
               step === 6 ? 'Pay Now' : 'Continue'}
              {step !== 5 && step !== 6 && <ArrowRight className="w-5 h-5" />}
              {step === 5 && <ShieldCheck className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
