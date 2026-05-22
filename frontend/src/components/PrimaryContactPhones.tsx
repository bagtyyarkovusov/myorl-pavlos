import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";
import {
  resolvePhoneSeparator,
  resolvePrimaryPhoneLinks,
  type ResolvedPhoneLink,
} from "@/lib/site/contact-fallbacks";

type PrimaryContactPhonesProps = {
  locale: Locale;
  settings: GlobalSettingsDTO;
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
};

export function PrimaryContactPhones({
  locale,
  settings,
  className,
  linkClassName,
  separatorClassName,
}: PrimaryContactPhonesProps) {
  const phones = resolvePrimaryPhoneLinks(settings);
  if (phones.length === 0) {
    return null;
  }

  const separator = resolvePhoneSeparator(locale);

  return (
    <span className={className}>
      {phones.map((phone, index) => (
        <PhoneLink
          key={phone.tel}
          phone={phone}
          separator={separator}
          showSeparator={index > 0}
          linkClassName={linkClassName}
          separatorClassName={separatorClassName}
        />
      ))}
    </span>
  );
}

function PhoneLink({
  phone,
  separator,
  showSeparator,
  linkClassName,
  separatorClassName,
}: {
  phone: ResolvedPhoneLink;
  separator: string;
  showSeparator: boolean;
  linkClassName?: string;
  separatorClassName?: string;
}) {
  return (
    <>
      {showSeparator ? (
        <span className={separatorClassName} aria-hidden="true">
          {separator}
        </span>
      ) : null}
      <a className={linkClassName} href={`tel:${phone.tel}`}>
        {phone.display}
      </a>
    </>
  );
}
