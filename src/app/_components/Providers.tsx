import type { ReactNode } from "react";
import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface Props {
  children: ReactNode;
}

const Providers = (props: Props) => {
  return <SessionProvider>{props.children}</SessionProvider>;
}

export default Providers;
