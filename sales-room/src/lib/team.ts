import { supabase } from "./supabase";

/**
 * Managing colleagues' accounts, through the backend route that holds the
 * admin key. Nothing here can work without a signed-in session, and the route
 * checks that again on its side — this file only carries the token.
 */

export interface Teammate {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROUTE = "/.netlify/functions/team";

/** Thrown for problems the rep can act on, with the route's own wording. */
export class TeamError extends Error {}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? {
    data: { session: null },
  };
  const token = data.session?.access_token;
  if (!token) throw new TeamError("Sign in again — your session has expired.");

  let res: Response;
  try {
    res = await fetch(ROUTE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TeamError(
      "Couldn't reach the server. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }
  if (res.status === 404) {
    throw new TeamError(
      "This isn't deployed yet. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }
  const payload = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok)
    throw new TeamError(payload?.error ?? `That failed (${res.status}).`);
  if (!payload) throw new TeamError("The server returned nothing.");
  return payload;
}

export const listTeam = () =>
  call<{ users: Teammate[] }>({ action: "list" }).then((r) => r.users);

/** Returns the one-time password to hand over; it is never retrievable again. */
export const addTeammate = (email: string) =>
  call<{ user: Teammate; password: string }>({ action: "create", email });

export const resetTeammatePassword = (userId: string) =>
  call<{ password: string }>({ action: "reset", userId }).then(
    (r) => r.password,
  );
