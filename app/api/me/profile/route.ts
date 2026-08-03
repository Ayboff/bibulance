import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().min(2, "Nom trop court").max(120),
  phone: z.string().min(6).max(30).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Données invalides");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      })
      .eq("id", session.userId)
      .select("id, email, full_name, phone")
      .single();

    if (error) throw new ApiError(400, error.message);
    return jsonOk({ ok: true, profile: data });
  } catch (error) {
    return jsonError(error);
  }
}
