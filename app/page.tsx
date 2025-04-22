import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import BackgroundVideo from "@/components/landing/BackgroundVideo";

export default async function Home() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <BackgroundVideo />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-4xl font-bold text-white my-12">
          Welcome to Djaouli Entertainment
        </h1>
      </main>
      <Footer />
    </div>
  );
}
