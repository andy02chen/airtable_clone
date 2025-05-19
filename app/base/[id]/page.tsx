import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "~/src/server/auth";
import { db } from "~/src/server/db";
import TableUI from "../components/TableUI";

export default async function BasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/');
  }

  const { id } = await params
  const baseId = Number(id);
  
  if (isNaN(baseId)) {
    notFound();
  }

  const base = await db.base.findUnique({
    where: { id: baseId },
  });

  if (!base || base.userId !== session.user.id) {
    redirect('/');
  }

  return (
    <TableUI baseName={base.name} baseID={base.id}/>
  );
}