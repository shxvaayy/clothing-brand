import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import AddressManager from "@/components/store/AddressManager";

export const metadata = { title: "My Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = (await getSessionUser())!;
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return <AddressManager initial={addresses} />;
}
