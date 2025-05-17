'use client';

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from 'next/image'

import profile from "~/app/imgs/default-pfp.jpg";

import { useState, useRef, useEffect } from "react";

export default function TopNavBar() {
  const { data: session, status } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <nav className="w-full p-2 flex justify-between items-center border-b border-gray-300 shadow">
      <div className="text-lg font-semibold">
        <Link href="/">Airtable</Link>
      </div>
      <div className="flex items-center gap-4">
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
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded cursor-pointer"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
