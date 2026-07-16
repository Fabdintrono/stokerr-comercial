"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { ModulesProvider } from "@/components/modules/ModulesProvider";
import { SubscriptionProvider } from "@/components/billing/SubscriptionProvider";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <I18nProvider defaultLocale="pt">
        <AuthProvider>
          <BusinessProvider>
            <SubscriptionProvider>
              <ModulesProvider>
                <SubscriptionGate>{children}</SubscriptionGate>
              </ModulesProvider>
            </SubscriptionProvider>
          </BusinessProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}