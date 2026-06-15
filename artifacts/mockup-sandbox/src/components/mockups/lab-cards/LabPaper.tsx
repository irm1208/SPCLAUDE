import React from 'react';
import { Check, AlertTriangle, Printer, Download } from 'lucide-react';

export function LabPaper() {
  const biomarkers = [
    { name: 'Testosterone', result: '28.5', unit: 'nmol/L', refRange: '8.0–29.0', status: 'in-range' },
    { name: 'LH', result: '0.2', unit: 'IU/L', refRange: '1.7–8.6', status: 'low' },
    { name: 'FSH', result: '0.3', unit: 'IU/L', refRange: '1.5–12.4', status: 'low' },
    { name: 'Haematocrit', result: '51.2', unit: '%', refRange: '37–50', status: 'high' },
    { name: 'Haemoglobin', result: '172', unit: 'g/L', refRange: '130–180', status: 'in-range' },
    { name: 'Total Cholesterol', result: '4.2', unit: 'mmol/L', refRange: '<5.2', status: 'in-range' },
    { name: 'HDL', result: '1.1', unit: 'mmol/L', refRange: '>1.0', status: 'in-range' },
    { name: 'LDL', result: '2.6', unit: 'mmol/L', refRange: '<3.4', status: 'in-range' },
    { name: 'Creatinine', result: '88', unit: 'μmol/L', refRange: '60–110', status: 'in-range' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="bg-white max-w-3xl w-full shadow-md border border-gray-300 font-serif text-slate-800 flex flex-col">
        {/* Letterhead */}
        <div className="bg-slate-50/50 p-8 border-b-4 border-slate-300 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-wider text-slate-900 uppercase">Medichecks</h1>
            <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest">Laboratory Results Report</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Date Reported:</p>
            <p>15 March 2026</p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-200 pb-2">Patient Test Details</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Test Name</p>
              <p className="font-semibold text-base mt-0.5">Full Blood Count — Trough</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Measurement Type</p>
              <p className="font-semibold text-base mt-0.5">Trough</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Total Markers</p>
              <p className="font-semibold text-base mt-0.5">24</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Out of Range</p>
              <p className="font-semibold text-base mt-0.5 text-red-600">3</p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-8 flex-grow">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 px-2 font-bold w-1/3">Biomarker</th>
                <th className="py-3 px-2 font-bold w-1/6">Result</th>
                <th className="py-3 px-2 font-bold w-1/6">Unit</th>
                <th className="py-3 px-2 font-bold w-1/6">Ref Range</th>
                <th className="py-3 px-2 font-bold text-center w-1/6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {biomarkers.map((marker, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50'}>
                  <td className="py-3 px-2 font-medium">{marker.name}</td>
                  <td className={`py-3 px-2 font-bold ${marker.status !== 'in-range' ? 'text-red-600' : ''}`}>
                    {marker.result}
                  </td>
                  <td className="py-3 px-2 text-slate-500">{marker.unit}</td>
                  <td className="py-3 px-2 text-slate-500">{marker.refRange}</td>
                  <td className="py-3 px-2 text-center">
                    {marker.status === 'in-range' ? (
                      <Check className="w-4 h-4 mx-auto text-green-600" />
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 font-bold text-xs">
                        {marker.status === 'low' ? 'L' : 'H'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50/30 border-t-2 border-slate-300 mt-auto">
          <div className="flex justify-between items-end">
            <div className="w-2/3">
              <div className="border border-red-300 bg-red-50 text-red-800 p-4 rounded-sm flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">3 results outside reference range</p>
                  <p className="text-xs mt-1 opacity-90">Please consult your healthcare provider regarding these highlighted results.</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 transition-colors">
              <Printer className="w-4 h-4" />
              <span>Print / Download</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
