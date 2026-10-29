"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(
  formData: FormData
) {
  const locale =
    String(
      formData.get(
        "locale"
      ) || "en"
    );

  const firstName =
    String(
      formData.get(
        "firstName"
      ) || ""
    ).trim();

  const countryCode =
    String(
      formData.get(
        "countryCode"
      ) || ""
    ).trim();

  const email =
    String(
      formData.get(
        "email"
      ) || ""
    ).trim();

  const password =
    String(
      formData.get(
        "password"
      ) || ""
    );

  if (
    !firstName ||
    !countryCode ||
    !email ||
    password.length < 8
  ) {
    redirect(
      `/${locale}/auth/signup?error=invalid`
    );
  }

  const client =
    createClient();

  const { error } =
    await client.auth.signUp(
      {
        email,
        password,

        options: {
          data: {
            first_name:
              firstName,

            country_code:
              countryCode,
          },
        },
      }
    );

  if (error) {
    redirect(
      `/${locale}/auth/signup?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(
    `/${locale}/auth/check-email`
  );
}

export async function logIn(
  formData: FormData
) {
  const locale =
    String(
      formData.get(
        "locale"
      ) || "en"
    );

  const email =
    String(
      formData.get(
        "email"
      ) || ""
    ).trim();

  const password =
    String(
      formData.get(
        "password"
      ) || ""
    );

  const client =
    createClient();

  const {
    data,
    error,
  } =
    await client.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

  if (
    error ||
    !data.user
  ) {
    redirect(
      `/${locale}/auth/login?error=invalid_credentials`
    );
  }

  await client
    .from(
      "activity_events"
    )
    .insert({
      user_id:
        data.user.id,

      event_type:
        "login",

      metadata: {},
    });

  const {
    data: profile,
  } = await client
    .from("profiles")
    .select("role")
    .eq(
      "id",
      data.user.id
    )
    .single();

  if (
    profile?.role ===
    "agent"
  ) {
    const {
      count,
    } = await client
      .from(
        "agent_store_preferences"
      )
      .select(
        "id",
        {
          count:
            "exact",
          head: true,
        }
      )
      .eq(
        "agent_id",
        data.user.id
      );

    if (
      !count ||
      count === 0
    ) {
      redirect(
        `/${locale}/onboarding`
      );
    }
  }

  redirect(
    `/${locale}/jobs`
  );
}

export async function logOut(
  formData: FormData
) {
  const locale =
    String(
      formData.get(
        "locale"
      ) || "en"
    );

  const client =
    createClient();

  await client.auth.signOut();

  redirect(
    `/${locale}/auth/login`
  );
}
