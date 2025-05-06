"use client";

import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";
import { cn } from "@/lib/actions/utils";

const codeItemsData = [
  {
    number: "1",
    titleKey: "djaouliCode.item1.title",
    descriptionKey: "djaouliCode.item1.description",
  },
  {
    number: "2",
    titleKey: "djaouliCode.item2.title",
    descriptionKey: "djaouliCode.item2.description",
  },
  {
    number: "3",
    titleKey: "djaouliCode.item3.title",
    descriptionKey: "djaouliCode.item3.description",
  },
  {
    number: "4",
    titleKey: "djaouliCode.item4.title",
    descriptionKey: "djaouliCode.item4.description",
  },
  {
    number: "5",
    titleKey: "djaouliCode.item5.title",
    descriptionKey: "djaouliCode.item5.description",
  },
  {
    number: "6",
    titleKey: "djaouliCode.item6.title",
    descriptionKey: "djaouliCode.item6.description",
  },
  {
    number: "7",
    titleKey: "djaouliCode.item7.title",
    descriptionKey: "djaouliCode.item7.description",
  },
  {
    number: "8",
    titleKey: "djaouliCode.item8.title",
    descriptionKey: "djaouliCode.item8.description",
  },
  {
    number: "9",
    titleKey: "djaouliCode.item9.title",
    descriptionKey: "djaouliCode.item9.description",
  },
  {
    number: "10",
    titleKey: "djaouliCode.item10.title",
    descriptionKey: "djaouliCode.item10.description",
  },
  {
    number: "11",
    titleKey: "djaouliCode.item11.title",
    descriptionKey: "djaouliCode.item11.description",
  },
];

export default function OurCodeSection() {
  const { currentLanguage } = useTranslation();

  const itemsToRender = [];
  const totalItems = codeItemsData.length;

  for (let i = 0; i < totalItems; i++) {
    itemsToRender.push(
      <CodeItem
        key={codeItemsData[i].number}
        number={codeItemsData[i].number}
        titleKey={codeItemsData[i].titleKey}
        descriptionKey={codeItemsData[i].descriptionKey}
        lang={currentLanguage}
      />,
    );

    if (totalItems === 11 && i === 9) {
      itemsToRender.push(
        <div key={`placeholder-${i}`} className="hidden lg:block"></div>,
      );
    }
  }

  return (
    <section className="relative bg-gradient-to-b from-sidebar to-background text-white py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 relative z-10">
        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {itemsToRender}
          </div>
        </div>
      </div>
    </section>
  );
}

interface CodeItemProps {
  number: string;
  titleKey: string;
  descriptionKey: string;
  lang: string;
}

function CodeItem({ number, titleKey, descriptionKey, lang }: CodeItemProps) {
  return (
    <div
      className={cn(
        "border w-full rounded-sm overflow-hidden shadow-lg",
        "bg-background",
        "border-slate-700 md:border-slate-800",
        "h-full flex flex-col",
      )}
    >
      <div
        className={cn(
          "size-full bg-repeat p-1",
          "bg-dot-pattern-light dark:bg-dot-pattern",
          "bg-[length:20px_20px]",
        )}
      >
        <div
          className={cn(
            "size-full bg-gradient-to-br",
            "from-background/95 via-background/70 to-background/40",
            "rounded-sm p-6 md:p-4 flex flex-col flex-grow",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-slate-400 font-semibold text-lg md:text-lg">
              {t(lang, "djaouliCode.prefix")} {number}.
            </h3>
          </div>
          <div className="text-gray-100 font-bold text-base md:text-base uppercase leading-tight mb-2">
            {t(lang, titleKey)}
          </div>
          <p className="text-gray-400 italic text-sm md:text-sm leading-relaxed flex-grow">
            {t(lang, descriptionKey)}
          </p>
        </div>
      </div>
    </div>
  );
}
