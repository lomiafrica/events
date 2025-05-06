import type { Language } from "./config";
import enTranslations from "./locales/en.json";
import frTranslations from "./locales/fr.json";

// Define a more specific type for translation values
export type TranslationValue =
  | string
  | number
  | { [key: string]: TranslationValue };

const translations: { [key in Language]: Record<string, TranslationValue> } = {
  en: enTranslations as Record<string, TranslationValue>,
  fr: frTranslations as Record<string, TranslationValue>,
};

export const getTranslations = (
  lang: Language,
): Record<string, TranslationValue> => {
  return translations[lang] || translations.en;
};

export const t = (
  lang: Language,
  key: string,
  values?: Record<string, string | number | undefined>,
) => {
  try {
    const keys = key.split(".");
    let currentVal: TranslationValue | undefined = getTranslations(lang);

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];

      if (currentVal && typeof currentVal === "object" && k in currentVal) {
        currentVal = currentVal[k];

        // Check if this is the last key and the value is a string
        if (
          i === keys.length - 1 &&
          (typeof currentVal === "string" || typeof currentVal === "number")
        ) {
          const currentValStr = String(currentVal);
          // Perform interpolation if values are provided
          if (values) {
            return currentValStr.replace(
              /\{(\w+)\}|\[\[(\w+)\]\]/g,
              (match, p1, p2) => {
                const placeholderKey = p1 || p2;
                const replacement = values[placeholderKey];
                return replacement !== undefined ? String(replacement) : match;
              },
            );
          } else {
            return currentValStr; // Return the string directly if no values
          }
        } else if (i === keys.length - 1) {
          // Last key, but value is not a string/number (or values not provided)
          console.warn(
            `Translation for key: ${key} in language: ${lang} resolved to a non-string/number or interpolation values missing, returning key.`,
          );
          return key;
        }
      } else {
        // Key not found or currentVal is not an object - fallback required
        console.warn(
          `Translation missing for key part: ${k} in key: ${key}, lang: ${lang}. Falling back.`,
        );
        const fallbackValue = getFallbackValue(keys, translations.en, values);
        return fallbackValue !== undefined ? fallbackValue : key;
      }
    }
    // Should not be reached if keys.length > 0, but return key as a safeguard
    return key;
  } catch (error) {
    console.error(`Translation error for key: ${key}`, error);
    return key;
  }
};

// Helper function to get a deeply nested value and perform interpolation
function getFallbackValue(
  keys: string[],
  obj: Record<string, TranslationValue>,
  values?: Record<string, string | number | undefined>,
): string | undefined {
  let currentVal: TranslationValue | undefined = obj;

  for (let i = 0; i < keys.length; i++) {
    const keyPart = keys[i];
    if (currentVal && typeof currentVal === "object" && keyPart in currentVal) {
      currentVal = currentVal[keyPart];
      // Check if last key and it's a string or number
      if (
        i === keys.length - 1 &&
        (typeof currentVal === "string" || typeof currentVal === "number")
      ) {
        const currentValStr = String(currentVal);
        // Perform interpolation if values are provided
        if (values) {
          return currentValStr.replace(
            /\{(\w+)\}|\[\[(\w+)\]\]/g,
            (match, p1, p2) => {
              const placeholderKey = p1 || p2;
              const replacement = values[placeholderKey];
              return replacement !== undefined ? String(replacement) : match;
            },
          );
        } else {
          return currentValStr; // Return the string directly if no values
        }
      }
    } else {
      return undefined; // Key not found or not an object
    }
  }

  // If the final resolved value wasn't a string or number (e.g., loop finished on an object)
  if (typeof currentVal !== "string" && typeof currentVal !== "number") {
    return undefined;
  }

  // Should technically be unreachable if the loop logic is correct, but satisfies TS
  return String(currentVal); // Ensure it returns string if it's a number
}
