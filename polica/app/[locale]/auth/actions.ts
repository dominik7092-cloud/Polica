"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function signUp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const firstName = String(formData.get("firstName") || "").trim();
  const countryCode = String(formData.get("countryCode") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!firstName || !countryCode || !email || password.length < 8) {
    redirect(`/${locale}/auth/signup?error=invalid`);
  }

  const client = supabase();

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        country_code: countryCode
      }
    }
  });

  if (error) {
    redirect(
      `/${locale}/auth/signup?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/${locale}/auth/check-email`);
}

export async function logIn(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const client = supabase();

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/${locale}/auth/login?error=invalid_credentials`);
  }

  redirect(`/${locale}/jobs`);
}

export async function logOut(formData: FormData) {
  const locale = String(formData.get("locale") || "en");

  const client = supabase();

  await client.auth.signOut();

  redirect(`/${locale}/auth/login`);
}
