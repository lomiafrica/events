import { Suspense } from "react";
import AdminClient from "./admin-client";
import LoadingComponent from "@/components/ui/Bouncer";

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <AdminClient />
    </Suspense>
  );
}
