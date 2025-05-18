'use client';
import { signIn } from "next-auth/react";

export default function GoogleButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-3 px-4 py-2 border rounded shadow hover:shadow-md transition cursor-pointer"
    >
      <img
        src="https://developers.google.com/identity/images/g-logo.png"
        alt="Google"
        className="w-5 h-5"
      />
      <span>Sign in with Google</span>
    </button>
  );
}