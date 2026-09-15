"use client";

import { ChevronDown, Phone } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/actions/utils";

const FieldSizeContext = React.createContext<"default" | "responsive">(
  "default",
);

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  fieldSize?: "default" | "responsive";
}

const fieldChrome =
  "border-input flex w-full min-w-0 rounded-sm border bg-transparent shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30";

export default function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Phone number",
  className,
  fieldSize = "default",
}: PhoneNumberInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<RPNInput.Country>();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const cachedCountryCode = localStorage.getItem("user_country_code");
    if (cachedCountryCode) {
      setDefaultCountry(cachedCountryCode as RPNInput.Country);
      return;
    }

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 2000),
    );

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
          localStorage.setItem("user_country_code", data.country_code);
          setDefaultCountry(data.country_code as RPNInput.Country);
        } else {
          throw new Error("Invalid data received");
        }
      })
      .catch(() => {
        setDefaultCountry("CI");
        localStorage.setItem("user_country_code", "CI");
      });
  }, []);

  return (
    <FieldSizeContext.Provider value={fieldSize}>
      <div
        className={cn(
          fieldChrome,
          fieldSize === "responsive" ? "min-h-11 md:h-9" : "h-11",
          isFocused && "border-ring ring-ring/50 ring-[3px] ring-inset",
          className,
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <RPNInput.default
          className="flex h-full w-full min-w-0 items-center"
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
    </FieldSizeContext.Provider>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const PhoneInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const fieldSize = React.useContext(FieldSizeContext);
    return (
      <input
        ref={ref}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm",
          fieldSize === "responsive" && "text-base md:text-sm",
          className,
        )}
        {...props}
        autoComplete="tel"
        inputMode="tel"
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
        "relative flex h-full shrink-0 items-center pl-3 pr-1",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center gap-1" aria-hidden="true">
        <FlagComponent country={value} countryName={value} aria-hidden="true" />
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <select
        disabled={disabled}
        value={value || ""}
        onChange={handleSelect}
        className="absolute inset-0 cursor-pointer opacity-0 outline-none"
        aria-label="Select country"
        data-lpignore="true"
      >
        <option value="">Select country</option>
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
    <span className="flex h-4 w-5 items-center justify-center overflow-hidden rounded-sm">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <Phone size={16} aria-hidden="true" role="presentation" />
      )}
    </span>
  );
};
