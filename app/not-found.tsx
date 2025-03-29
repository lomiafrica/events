import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page non trouvée</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link href="/">Retour à la page d&apos;accueil</Link>
      </Button>
    </div>
  )
}

