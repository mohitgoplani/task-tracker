"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");
  return (
    <Card className="max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">Sign in failed</h1>
      <p className="text-sm text-muted-foreground mt-2">{error || "Something went wrong."}</p>
      {error === "not_invited" && (
        <p className="text-sm mt-3">An admin needs to invite you first. Reach out to your team's admin.</p>
      )}
      <Button asChild className="mt-6" variant="outline">
        <Link href="/auth/login">Try again</Link>
      </Button>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="max-w-md p-8 text-center">
            <h1 className="text-xl font-bold">Sign in failed</h1>
          </Card>
        }
      >
        <ErrorContent />
      </Suspense>
    </div>
  );
}
