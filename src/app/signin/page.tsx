
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import type { FirebaseError } from "firebase/app";
import { AlertCircle } from "lucide-react";

const signinSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, "Password is required"),
});

type SigninForm = z.infer<typeof signinSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SigninForm>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      toast({
        title: "Signed in!",
        description: "Redirecting to your dashboard...",
      });
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router, toast]);

  function getAuthErrorMessage(error: FirebaseError): string {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password. Please check your details and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  function onSubmit(values: SigninForm) {
    if (!auth) return;
    setIsSubmitting(true);
    form.clearErrors();
    initiateEmailSignIn(auth, values.email, values.password, (error: FirebaseError) => {
      const message = getAuthErrorMessage(error);
      form.setError("root", { message });
      setIsSubmitting(false);
    });
  }

  const { errors } = form.formState;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12" style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #0f4c2a 45%, #7a5500 80%, #c9891a 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
             <div className="h-16 w-16 rounded-2xl object-cover shadow-2xl bg-primary flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary-foreground"
              >
                <circle cx="16" cy="16" r="14" fill="currentColor" />
                <path
                  d="M17.866 10.6667L14.666 16.5333H19.2L15.4673 24L18.6673 17.8667H14.134L17.866 10.6667Z"
                  fill="#000"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="15"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Coin<span className="text-amber-400">Power</span></h1>
          <p className="text-amber-200/80 mt-1 text-sm font-medium">Digital Energy Mining Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
          style={{ borderTop: "4px solid transparent", borderImage: "linear-gradient(90deg,#0f4c2a,#c9891a,#0f4c2a) 1" }}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-5 sm:mb-6">Sign in to your investment account</p>

            {errors.root && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-3 mb-4 sm:mb-5" data-testid="error-signin">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{errors.root.message}</p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium text-sm">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          className={`h-11 transition-colors ${
                            errors.email
                              ? "border-red-400 focus:border-red-500 bg-red-50 focus-visible:ring-red-200"
                              : "border-gray-200 focus:border-amber-400 focus-visible:ring-amber-200"
                          }`}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-xs font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium text-sm">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          data-testid="input-password"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className={`h-11 transition-colors ${
                            errors.password
                              ? "border-red-400 focus:border-red-500 bg-red-50 focus-visible:ring-red-200"
                              : "border-gray-200 focus:border-amber-400 focus-visible:ring-amber-200"
                          }`}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-xs font-medium" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  data-testid="button-signin"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 mt-1"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center space-y-2">
              <p className="text-gray-500 text-sm">
                Don't have an account?{" "}
                <Link href="/signup">
                  <span className="text-amber-600 font-semibold hover:text-amber-700 cursor-pointer" data-testid="link-signup">
                    Create account
                  </span>
                </Link>
              </p>
               <p className="text-xs text-gray-400">
                <Link href="/admin" className="hover:text-amber-700 transition-colors" data-testid="link-admin">
                  Admin Panel
                </Link>
              </p>
            </div>

          </div>
        </div>
    </div>
  );
}
