"use client";

import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

const today = new Date();
const formattedDate = today.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function TermsClientPage() {
  const { currentLanguage } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <article
          className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert lg:prose-lg
                          prose-headings:text-primary prose-headings:font-semibold
                          prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mb-6 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border
                          prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
                          prose-p:leading-relaxed
                          prose-a:text-primary hover:prose-a:underline
                          prose-strong:font-semibold
                          prose-ul:list-disc prose-ul:pl-5 prose-ul:my-4
                          prose-li:my-1.5"
        >
          <h1>{t(currentLanguage, "termsPage.title")}</h1>

          <p className="text-sm text-muted-foreground">
            {t(currentLanguage, "termsPage.subtitle")}
            <br />
            {t(currentLanguage, "termsPage.lastUpdated", {
              date: formattedDate,
            })}
          </p>

          <h2>{t(currentLanguage, "termsPage.introduction.title")}</h2>
          <p>{t(currentLanguage, "termsPage.introduction.p1")}</p>
          <p>{t(currentLanguage, "termsPage.introduction.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.mission.title")}</h2>
          <p>{t(currentLanguage, "termsPage.mission.p1")}</p>
          <p>{t(currentLanguage, "termsPage.mission.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.conduct.title")}</h2>
          <p>{t(currentLanguage, "termsPage.conduct.p1")}</p>
          <ul>
            <li>{t(currentLanguage, "termsPage.conduct.listItem1")}</li>
            <li>{t(currentLanguage, "termsPage.conduct.listItem2")}</li>
            <li>{t(currentLanguage, "termsPage.conduct.listItem3")}</li>
          </ul>
          <p>{t(currentLanguage, "termsPage.conduct.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.tickets.title")}</h2>
          <p>{t(currentLanguage, "termsPage.tickets.p1")}</p>
          <p>{t(currentLanguage, "termsPage.tickets.p2")}</p>
          <p>{t(currentLanguage, "termsPage.tickets.p3")}</p>

          <h2>{t(currentLanguage, "termsPage.ip.title")}</h2>
          <p>{t(currentLanguage, "termsPage.ip.p1")}</p>
          <p>{t(currentLanguage, "termsPage.ip.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.userContent.title")}</h2>
          <p>{t(currentLanguage, "termsPage.userContent.p1")}</p>
          <p>{t(currentLanguage, "termsPage.userContent.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.liability.title")}</h2>
          <p>{t(currentLanguage, "termsPage.liability.p1")}</p>
          <p>{t(currentLanguage, "termsPage.liability.p2")}</p>
          <p>{t(currentLanguage, "termsPage.liability.p3")}</p>

          <h2>{t(currentLanguage, "termsPage.indemnification.title")}</h2>
          <p>{t(currentLanguage, "termsPage.indemnification.p1")}</p>

          <h2>{t(currentLanguage, "termsPage.governingLaw.title")}</h2>
          <p>{t(currentLanguage, "termsPage.governingLaw.p1")}</p>

          <h2>{t(currentLanguage, "termsPage.changes.title")}</h2>
          <p>{t(currentLanguage, "termsPage.changes.p1")}</p>
          <p>{t(currentLanguage, "termsPage.changes.p2")}</p>

          <h2>{t(currentLanguage, "termsPage.contact.title")}</h2>
          <p>{t(currentLanguage, "termsPage.contact.p1")}</p>
          <p>{t(currentLanguage, "termsPage.contact.p2")}</p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
