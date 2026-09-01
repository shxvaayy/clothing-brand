import { getDeliveryProvider } from "@/lib/delivery/factory";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    const pincode = new URL(req.url).searchParams.get("pincode") ?? "";
    if (!/^[1-9][0-9]{5}$/.test(pincode)) return badRequest("Invalid pincode");
    const provider = getDeliveryProvider();
    const result = await provider.checkServiceability(pincode);
    return ok({ ...result, provider: provider.name });
  } catch (e) {
    return handleApiError(e);
  }
}
