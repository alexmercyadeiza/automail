import bcrypt from "bcryptjs";
import { createServerFn } from "@tanstack/react-start";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
};

export type CreateAdminPayload = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export type UpdateAdminPayload = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  password?: string;
};

const SALT_ROUNDS = 10;

export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("admins")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const, users: data as AdminUser[] };
  },
);

export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator(
    (d: CreateAdminPayload) => d,
  )
  .handler(async ({ data }) => {
    if (!data.email?.trim()) {
      return { ok: false, message: "Email is required" };
    }
    if (!data.password || data.password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters" };
    }
    if (!data.name?.trim()) {
      return { ok: false, message: "Name is required" };
    }

    const supabase = createServiceClient();

    // Check for existing email
    const { data: existing } = await supabase
      .from("admins")
      .select("id")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return { ok: false, message: "An account with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from("admins")
      .insert({
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        name: data.name.trim(),
        role: data.role || "admin",
      })
      .select("id, email, name, role, created_at")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: user as AdminUser };
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .inputValidator(
    (d: UpdateAdminPayload) => d,
  )
  .handler(async ({ data }) => {
    if (!data.id) {
      return { ok: false, message: "Missing user id" };
    }

    const supabase = createServiceClient();

    const updates: Record<string, string> = {};

    if (data.email !== undefined) {
      updates.email = data.email.trim().toLowerCase();
    }
    if (data.name !== undefined) {
      updates.name = data.name.trim();
    }
    if (data.role !== undefined) {
      updates.role = data.role;
    }
    if (data.password) {
      if (data.password.length < 6) {
        return { ok: false, message: "Password must be at least 6 characters" };
      }
      updates.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return { ok: false, message: "No fields to update" };
    }

    const { data: user, error } = await supabase
      .from("admins")
      .update(updates)
      .eq("id", data.id)
      .select("id, email, name, role, created_at")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: user as AdminUser };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: userId }) => {
    if (!userId) {
      return { ok: false, message: "Missing user id" };
    }

    const supabase = createServiceClient();

    // Prevent deleting the last admin
    const { count } = await supabase
      .from("admins")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Cannot delete the last admin user" };
    }

    const { error } = await supabase
      .from("admins")
      .delete()
      .eq("id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });
