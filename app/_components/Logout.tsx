'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react';

export default function LogOut() {
  const { data: session, status } = useSession();

  const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
  
    const profile = '/imgs/default-pfp.jpg';
  
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      }
  
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }
  
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

  if (status !== "authenticated") return null;

  return (
  <div className="flex items-center gap-4 select-none">
    <span>{session.user?.name}</span>
    <Image
      src={session.user?.image ?? profile}
      width={25}
      height={25}
      alt="Picture of the author"
      className="rounded-full cursor-pointer"
      onClick={() => setIsOpen((prev) => !prev)}
    />
    {isOpen && (
      <div ref={dropdownRef} className="fixed right-0 top-10 w-36 bg-white border rounded shadow-md z-50">
        <button
          onClick={async () => {
            setIsOpen(false);
            await signOut();
          }}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded cursor-pointer text-black"
        >
          Log Out
        </button>
      </div>
    )}
  </div>
  );
}