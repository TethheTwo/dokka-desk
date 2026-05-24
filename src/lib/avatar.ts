import { supabase } from "@/integrations/supabase/client";

export async function uploadAvatar(file: Blob): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const ext = (file as File).name?.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: (file as File).type || "image/png",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
  return data.publicUrl;
}

export async function deleteAvatar(currentUrl?: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (currentUrl) {
    const idx = currentUrl.indexOf("/avatars/");
    if (idx >= 0) {
      const path = currentUrl.substring(idx + "/avatars/".length);
      await supabase.storage.from("avatars").remove([path]);
    }
  }
}
