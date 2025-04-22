"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-screen px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md text-center">
        <h1 className="text-9xl font-extrabold mb-4 text-foreground">404</h1>
        <h2 className="text-3xl font-semibold mb-4">Oops! Page Not Found!</h2>
        <p className="text-muted-foreground mb-8">
          It seems like the page you&apos;re looking for
          <br />
          does not exist or might have been removed.
        </p>
        <div className="flex gap-4 justify-center items-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="h-10"
          >
            Go Back
          </Button>
          <Button asChild className="h-10">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
