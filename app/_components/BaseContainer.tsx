'use client'

import { api } from "~/src/trpc/react";
import { getBaseColorClass } from "../utils/colours";
import Loading from "./Loading";
import Link from "next/link";

export default function BaseContainer() {
  const { data: bases = [], isLoading, error} = api.base.list.useQuery();
  
  if (error) return <p>Error loading bases: {error.message}</p>;

  return(
    <div className="flex-grow p-6 overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center">
            <Loading />
          </div>
        ) :
        (bases.map((base) => (
          <Link key={base.id} href={`/base/${base.id}`}>
            <div 
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow
              flex items-center gap-4"
            >
              <div className={`rounded w-12 h-12 ${getBaseColorClass(base.id).baseColour} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud-icon lucide-cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
              </div>
              <h3 className="font-semibold text-lg">{base.name}</h3>
            </div>
          </Link>
        )))
        }
      </div>
    </div>
  );
}