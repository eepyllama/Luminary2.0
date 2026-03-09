import { supabase } from "@/integrations/supabase/client";

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  return { error };
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "http://localhost:8080",
    },
  });
  return { error };
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Saves a generated mind map layout and returns its id
export async function saveMap(userId, rawTopic, laid) {
  const { data, error } = await supabase
    .from("maps")
    .insert({
      user_id: userId,
      topic: rawTopic,
      layout: laid,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving map:", error);
    throw error;
  }

  return data?.id;
}
