"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  tenantSlug: z.string().min(1, "Workspace is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

/** Tenant-scoped sign-in form (workspace slug + email + password). */
export function LoginForm(): React.JSX.Element {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      router.push("/dashboard");
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "Unable to sign in",
      );
    }
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-xl font-bold text-slate-900">Sign in to NEXORA</h1>
        <p className="text-sm text-slate-500">Access your CRM workspace</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="tenantSlug">Workspace</Label>
            <Input
              id="tenantSlug"
              placeholder="acme-corp"
              autoComplete="organization"
              {...register("tenantSlug")}
            />
            {errors.tenantSlug && (
              <p className="text-xs text-red-600">{errors.tenantSlug.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          {serverError && (
            <p className="text-sm text-red-600" role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
