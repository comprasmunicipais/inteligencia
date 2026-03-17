import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import './globals.css'; // Global styles
import { CompanyProvider } from '@/components/providers/CompanyProvider';

export const metadata: Metadata = {
  title: 'CM Intelligence',
  description: 'Plataforma de Inteligência Comercial para Mercado Público',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <CompanyProvider>
          {children}
        </CompanyProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
