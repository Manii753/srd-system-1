'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock } from 'lucide-react';





function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function LoginPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (session) {
      if (session?.user?.role) {
        // Honour explicit callbackUrl first (e.g. /mobile redirect from mobile layout)
        const callbackUrl = searchParams.get('callbackUrl');
        if (callbackUrl) {
          router.push(callbackUrl);
          return;
        }

        // Auto-redirect mobile browsers to the mobile app
        if (isMobileBrowser()) {
          router.push('/mobile');
          return;
        }

        const role = session.user.role;
        if (role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push(`/dashboard/${role}`);
        }
      }
    }
  }, [session, router, searchParams]);




  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {

      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { email: 'admin@demo.com', role: 'Admin', category: 'Management' },
    { email: 'vmd@demo.com', role: 'VMD Manager', category: 'Approval' },
    { email: 'cad@demo.com', role: 'CAD Manager', category: 'Approval' },
    { email: 'commercial@demo.com', role: 'Commercial Manager', category: 'Approval' },
    { email: 'mmc@demo.com', role: 'MMC Manager', category: 'Approval' },
    { email: 'cutting@srds.com', role: 'Cutting', category: 'Production', password: 'cutting123' },
    { email: 'sewing@srds.com', role: 'Sewing', category: 'Production', password: 'sewing123' },
    { email: 'washing@srds.com', role: 'Washing', category: 'Production', password: 'washing123' },
    { email: 'finishing@srds.com', role: 'Finishing', category: 'Production', password: 'finishing123' },
    { email: 'dispatch@srds.com', role: 'Dispatch', category: 'Production', password: 'dispatch123' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-app-heading font-bold text-gray-900">SRD Tracking System</h2>
          <p className="mt-2 text-app-text text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-app-text text-center">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <div className="w-full space-y-4">
              <p className="text-app-text font-medium text-center text-gray-700">Demo Accounts:</p>

              {/* Management */}
              <div>
                <p className="text-app-heading font-semibold text-gray-600 mb-2">Management:</p>
                {demoCredentials.filter(c => c.category === 'Management').map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password || 'password');
                    }}
                    className="w-full text-left p-2 text-app-text bg-purple-50 hover:bg-purple-100 rounded-md transition-colors mb-1"
                  >
                    <span className="font-medium">{cred.role}:</span> {cred.email}
                    <span className="text-gray-500 ml-2">({cred.password || 'password'})</span>
                  </button>
                ))}
              </div>

              {/* Approval Departments */}
              <div>
                <p className="text-app-heading font-semibold text-gray-600 mb-2">Approval Departments:</p>
                {demoCredentials.filter(c => c.category === 'Approval').map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password || 'password');
                    }}
                    className="w-full text-left p-2 text-app-text bg-blue-50 hover:bg-blue-100 rounded-md transition-colors mb-1"
                  >
                    <span className="font-medium">{cred.role}:</span> {cred.email}
                    <span className="text-gray-500 ml-2">({cred.password || 'password'})</span>
                  </button>
                ))}
              </div>

              {/* Production Stages */}
              <div>
                <p className="text-app-heading font-semibold text-gray-600 mb-2">🏭 Production Stages:</p>
                {demoCredentials.filter(c => c.category === 'Production').map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password || 'password');
                    }}
                    className="w-full text-left p-2 text-app-text bg-green-50 hover:bg-green-100 rounded-md transition-colors mb-1"
                  >
                    <span className="font-medium">{cred.role}:</span> {cred.email}
                    <span className="text-gray-500 ml-2">({cred.password})</span>
                  </button>
                ))}
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

