"use client";

import { CheckCircle, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface PaymentSuccessClientProps {
  purchaseId?: string;
}

export function PaymentSuccessClient({
  purchaseId,
}: PaymentSuccessClientProps) {
  const { currentLanguage } = useTranslation();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-sm flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200">
                {t(currentLanguage, "paymentSuccess.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-gray-600 dark:text-gray-300">
                <p>{t(currentLanguage, "paymentSuccess.description")}</p>
                {purchaseId && (
                  <p className="text-sm mt-2 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded-sm">
                    {t(currentLanguage, "paymentSuccess.orderId", {
                      orderId: purchaseId,
                    })}
                  </p>
                )}
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    {t(currentLanguage, "paymentSuccess.whatsNext.title")}
                  </h3>
                </div>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>
                    •{" "}
                    {t(currentLanguage, "paymentSuccess.whatsNext.checkEmail")}
                  </li>
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      "paymentSuccess.whatsNext.presentTicket",
                    )}
                  </li>
                  <li>
                    •{" "}
                    {t(currentLanguage, "paymentSuccess.whatsNext.arriveEarly")}
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/gallery">
                    {t(currentLanguage, "paymentSuccess.buttons.browseGallery")}
                  </Link>
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                {t(currentLanguage, "paymentSuccess.support")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
