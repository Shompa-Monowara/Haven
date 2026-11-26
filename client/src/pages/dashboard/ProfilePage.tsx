import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome, roleLabels, type AuthUser } from "@/types/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  phone: z.string().trim().max(24, "Phone number is too long").optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use 72 characters or fewer")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  if (!user) return null;

  async function onProfileSubmit(values: ProfileValues) {
    setProfileError(null);

    try {
      const data = await api.patch<{ user: AuthUser }>("/account/profile", {
        name: values.name,
        phone: values.phone || undefined,
      });
      useAuthStore.getState().updateUser(data.user);
      profileForm.reset({ name: data.user.name, phone: data.user.phone ?? "" });
      toast.success("Profile updated");
    } catch (error) {
      setProfileError(
        error instanceof ApiClientError ? error.message : "Unable to update your profile.",
      );
    }
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setPasswordError(null);

    try {
      await api.patch("/account/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      useAuthStore.getState().clear();
      toast.success("Password updated. Sign in again.");
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordError(
        error instanceof ApiClientError ? error.message : "Unable to update your password.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
          Profile and security
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Keep your contact details current. Buyer contact details are only shared with agents you
          contact.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="details-heading">
          <h3 id="details-heading" className="text-lg font-semibold text-heading">
            Account details
          </h3>

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} noValidate className="mt-5 space-y-4">
            {profileError ? (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger-tint px-3.5 py-2.5 text-sm text-danger">
                {profileError}
              </p>
            ) : null}

            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-heading">
                Full name
              </label>
              <Input
                id="profile-name"
                autoComplete="name"
                aria-invalid={Boolean(profileForm.formState.errors.name) || undefined}
                {...profileForm.register("name")}
              />
              {profileForm.formState.errors.name ? (
                <p className="mt-1.5 text-sm text-danger">
                  {profileForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-heading">
                Email address
              </label>
              <Input id="profile-email" value={user.email} readOnly disabled />
              <p className="mt-1.5 text-xs text-muted">
                Email changes require verification and are not available yet.
              </p>
            </div>

            <div>
              <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-heading">
                Phone <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(profileForm.formState.errors.phone) || undefined}
                {...profileForm.register("phone")}
              />
              {profileForm.formState.errors.phone ? (
                <p className="mt-1.5 text-sm text-danger">
                  {profileForm.formState.errors.phone.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" loading={profileForm.formState.isSubmitting}>
              Save changes
            </Button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="photo-heading">
            <h3 id="photo-heading" className="text-lg font-semibold text-heading">
              Profile photo
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-body">
              Your photo appears beside your name in the header, on listings, and in messages.
            </p>
            <div className="mt-5">
              <AvatarUploader />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="account-meta-heading">
            <h3 id="account-meta-heading" className="text-lg font-semibold text-heading">
              Account
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body">Role</dt>
                <dd className="font-medium text-heading">{roleLabels[user.role]}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body">Status</dt>
                <dd className="inline-flex items-center gap-1.5 rounded-pill bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Active
                </dd>
              </div>
              {user.createdAt ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Member since</dt>
                  <dd className="text-heading">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
            <Link
              to={roleHome(user.role)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
            >
              Back to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="password-heading">
            <h3 id="password-heading" className="text-lg font-semibold text-heading">
              Change password
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-body">
              Updating your password signs you out on every device.
            </p>

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="mt-4 space-y-3.5">
              {passwordError ? (
                <p role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {passwordError}
                </p>
              ) : null}

              <div>
                <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-heading">
                  Current password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register("currentPassword")}
                />
                {passwordForm.formState.errors.currentPassword ? (
                  <p className="mt-1.5 text-sm text-danger">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-heading">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("newPassword")}
                />
                {passwordForm.formState.errors.newPassword ? (
                  <p className="mt-1.5 text-sm text-danger">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-heading">
                  Confirm new password
                </label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordForm.formState.errors.confirmPassword ? (
                  <p className="mt-1.5 text-sm text-danger">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="outline"
                loading={passwordForm.formState.isSubmitting}
                className="w-full"
              >
                Update password
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}