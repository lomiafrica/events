"use client";

import { XCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface PaymentCancelClientProps {
  purchaseId?: string;
  flow?: string;
}

export function PaymentCancelClient({
  purchaseId,
  flow,
}: PaymentCancelClientProps) {
  const { currentLanguage } = useTranslation();

  // Default to ticket copy if flow is not provided or unknown
  const translationBaseKey =
    flow === "merch" ? "paymentCancelMerch" : "paymentCancel";

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-sm flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {t(currentLanguage, `${translationBaseKey}.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-gray-600 dark:text-gray-300">
                <p>{t(currentLanguage, `${translationBaseKey}.description`)}</p>
                {purchaseId && (
                  <p className="text-sm mt-2 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {t(currentLanguage, `${translationBaseKey}.orderId`, {
                      orderId: purchaseId,
                    })}
                  </p>
                )}
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {t(
                      currentLanguage,
                      `${translationBaseKey}.whatsNext.title`,
                    )}
                  </h3>
                </div>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      `${translationBaseKey}.whatsNext.tryAgain`,
                    )}
                  </li>
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      `${translationBaseKey}.whatsNext.differentMethod`,
                    )}
                  </li>
                  <li>
                    •{" "}
                    {t(
                      currentLanguage,
                      `${translationBaseKey}.whatsNext.contactSupport`,
                    )}
                  </li>
                </ul>
              </div>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                {t(currentLanguage, `${translationBaseKey}.support`)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
