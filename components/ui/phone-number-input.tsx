"use client";

import { ChevronDown, Phone } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/actions/utils";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Phone number",
  className,
}: PhoneNumberInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<RPNInput.Country>();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // First check if we have a cached country code in localStorage
    const cachedCountryCode = localStorage.getItem("user_country_code");
    if (cachedCountryCode) {
      setDefaultCountry(cachedCountryCode as RPNInput.Country);
      return;
    }

    // Add a timeout for the fetch to avoid long waits
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 2000),
    );

    // Try to get user's country using ipapi.co
    Promise.race([
      fetch("https://ipapi.co/json/", {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      }),
      timeoutPromise,
    ])
      .then((data) => {
        if (data && data.country_code) {
          // Cache the result in localStorage for future use
          localStorage.setItem("user_country_code", data.country_code);
          setDefaultCountry(data.country_code as RPNInput.Country);
        } else {
          throw new Error("Invalid data received");
        }
      })
      .catch(() => {
        // If ipapi.co fails, try a fallback to CI (Côte d'Ivoire)
        setDefaultCountry("CI");
        localStorage.setItem("user_country_code", "CI");
      });
  }, []);

  return (
    <div className={cn("w-full relative", className)}>
      <div
        className={cn(
          "flex w-full rounded-sm border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
          isFocused && "border-ring ring-ring/50 ring-[3px]",
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <RPNInput.default
          className="flex PhoneInput w-full"
          international
          defaultCountry={defaultCountry}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={PhoneInput}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          smartCaret={true}
          countryCallingCodeEditable={true}
        />
      </div>
    </div>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const PhoneInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30",
          "flex h-11 w-full min-w-0 bg-transparent px-3 py-1 text-base outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "border-0 shadow-none rounded-l-sm rounded-r-sm",
          className,
        )}
        {...props}
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
      />
    );
  },
);

PhoneInput.displayName = "PhoneInput";

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country }[];
};

const CountrySelect = ({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) => {
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as RPNInput.Country);
  };

  return (
    <div
      className={cn(
        "PhoneInputCountry relative inline-flex items-center self-stretch bg-transparent text-foreground outline-none",
        "flex h-11 min-w-0 px-3 py-1 border-0 shadow-none rounded-l-sm rounded-r-sm",
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      <div className="inline-flex items-center gap-1.5" aria-hidden="true">
        <FlagComponent country={value} countryName={value} aria-hidden="true" />
        <span className="text-muted-foreground/80">
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <select
        disabled={disabled}
        value={value || ""}
        onChange={handleSelect}
        className="absolute inset-0 text-sm opacity-0 outline-none cursor-pointer"
        aria-label="Select country"
        data-lpignore="true"
      >
        <option value="" className="text-gray-400">
          Select country
        </option>
        {options
          .filter((x) => x.value)
          .map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}{" "}
              {option.value &&
                `+${RPNInput.getCountryCallingCode(option.value)}`}
            </option>
          ))}
      </select>
    </div>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="w-5 h-4 overflow-hidden rounded-sm flex items-center justify-center">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <Phone size={16} aria-hidden="true" role="presentation" />
      )}
    </span>
  );
};
