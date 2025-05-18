'use client';
import { getBaseColorClass } from "../utils/colours";

export default function Dashboard() {
  const bases = [
    { id: 1, name: 'Base Alpha'},
    { id: 2, name: 'Base Beta'},
    { id: 3, name: 'Base Gamma'},
    { id: 4, name: 'Base Delta'},
    { id: 5, name: 'Base Epsilon'},
    { id: 6, name: 'New Base'},
  ];

  return(
    <div className="flex flex-col h-screen w-screen">
      <div className="flex items-center">
        <h1 className="font-bold text-3xl p-4">Dashboard</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">Create Base</button>
      </div>
      <div className="bg-red-300 flex-grow p-6 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bases.map((base) => (
            <div 
              key={base.id}
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow
              flex items-center gap-4"
            >
              <div className={`rounded w-12 h-12 ${getBaseColorClass(base.id)} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud-icon lucide-cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
              </div>
              <h3 className="font-semibold text-lg">{base.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}