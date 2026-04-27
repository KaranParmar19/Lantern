import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'Lantern APM — Application Performance Monitoring',
  description: 'Lightweight, open-source APM for Node.js apps. Monitor request performance, errors, and system health in real-time.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
