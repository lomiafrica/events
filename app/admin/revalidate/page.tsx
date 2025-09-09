"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { revalidateAll } from "@/lib/actions/revalidate";

export default function RevalidatePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const router = useRouter();

  useEffect(() => {
    const performRevalidation = async () => {
      try {
        await revalidateAll();
        setStatus("success");

        // Redirect to home page after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (error) {
        console.error("Revalidation failed:", error);
        setStatus("error");
        // Stay on page if there's an error
      }
    };

    performRevalidation();
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="text-2xl mb-4">🔄</div>
            <h1 className="text-2xl font-bold mb-2">
              Revalidation in progress...
            </h1>
            <p className="text-muted-foreground">
              Refreshing your website content
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-2xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Revalidation complete!</h1>
            <p className="text-muted-foreground">Redirecting to home page...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-2xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Revalidation failed</h1>
            <p className="text-muted-foreground">
              Please try again or check the console
            </p>
          </>
        )}
      </div>
    </div>
  );
}
