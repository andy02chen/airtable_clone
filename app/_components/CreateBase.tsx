import { api } from "~/src/trpc/react";
import { toast } from "sonner";

export default function CreateBase() {
  const utils = api.useUtils();

  const createBase = api.base.create.useMutation();

  return(
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      onClick={async () => {
      try {
        await createBase.mutateAsync({ name: "test" });
        await utils.base.list.invalidate();
        toast.success("Base created successfully!");
      } catch (error) {
        toast.error(`Failed to create base`);
        console.error("Creation error:", error);
      }
  }}
    >
      Create Base
    </button>
  );
}