'use client';
import BaseContainer from "./BaseContainer";
import CreateBase from "./CreateBase";

export default function Dashboard() {
  return(
    <div className="flex flex-col h-screen w-screen bg-gray-100 ">
      <div className="flex items-center">
        <h1 className="font-bold text-3xl p-4">Dashboard</h1>
        <CreateBase/>
      </div>
      <BaseContainer/>
    </div>
  );
}