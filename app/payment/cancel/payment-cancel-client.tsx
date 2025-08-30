"use client";

import { XCircle, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface PaymentCancelClientProps {
  purchaseId?: string;
}

export function PaymentCancelClient({ purchaseId }: PaymentCancelClientProps) {
  const { currentLanguage } = useTranslation();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {t(currentLanguage, "paymentCancel.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-gray-600 dark:text-gray-300">
                <p>{t(currentLanguage, "paymentCancel.description")}</p>
                {purchaseId && (
                  <p className="text-sm mt-2 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {t(currentLanguage, "paymentCancel.orderId", {
                      orderId: purchaseId,
                    })}
                  </p>
                )}
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {t(currentLanguage, "paymentCancel.whatsNext.title")}
                  </h3>
                </div>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  <li>
                    • {t(currentLanguage, "paymentCancel.whatsNext.tryAgain")}
                  </li>
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      "paymentCancel.whatsNext.differentMethod",
                    )}
                  </li>
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      "paymentCancel.whatsNext.contactSupport",
                    )}
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild className="w-full">
                  <Link href="/">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t(currentLanguage, "paymentCancel.buttons.backToEvents")}
                  </Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href="/gallery">
                    {t(currentLanguage, "paymentCancel.buttons.browseGallery")}
                  </Link>
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                {t(currentLanguage, "paymentCancel.support")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
