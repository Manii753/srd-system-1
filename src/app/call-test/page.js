'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import SimpleCall from '@/components/SimpleCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Wifi, Mic, Volume2 } from 'lucide-react';

export default function CallTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [diagnostics, setDiagnostics] = useState({
    webrtc: false,
    microphone: false,
    pusher: false,
    https: false
  });
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const pusherRef = useRef(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Fetch users
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.data.filter(u => u.email !== session.user.email));
        }
      });

    // Setup Pusher
    const setupPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default;
        pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
          forceTLS: true
        });

        // Test Pusher connection
        pusherRef.current.connection.bind('connected', () => {

          setDiagnostics(prev => ({ ...prev, pusher: true }));
        });

        pusherRef.current.connection.bind('error', (error) => {
          console.error('❌ Pusher connection error:', error);
          setDiagnostics(prev => ({ ...prev, pusher: false }));
        });

      } catch (error) {
        console.error('❌ Failed to setup Pusher:', error);
        setDiagnostics(prev => ({ ...prev, pusher: false }));
      }
    };

    setupPusher();
    runDiagnostics();

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [session, status, router]);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);

    try {
      // Check HTTPS
      const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      setDiagnostics(prev => ({ ...prev, https: isHttps }));

      // Check WebRTC support
      const hasWebRTC = !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setDiagnostics(prev => ({ ...prev, webrtc: hasWebRTC }));

      // Check microphone access
      if (hasWebRTC) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setDiagnostics(prev => ({ ...prev, microphone: true }));
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.warn('Microphone access denied or not available:', error);
          setDiagnostics(prev => ({ ...prev, microphone: false }));
        }
      }

    } catch (error) {
      console.error('Diagnostics error:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const DiagnosticItem = ({ label, status, icon: Icon, description }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${status ? 'text-green-600' : 'text-red-600'}`} />
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-app-text text-gray-500">{description}</div>
        </div>
      </div>
      <Badge variant={status ? 'default' : 'destructive'}>
        {status ? 'OK' : 'FAIL'}
      </Badge>
    </div>
  );

  if (status === 'loading') {
    return <Layout><div className="p-8">Loading...</div></Layout>;
  }

  const allDiagnosticsPassed = Object.values(diagnostics).every(Boolean);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-app-heading font-bold mb-6">WebRTC Call Test & Diagnostics</h1>

        {/* Diagnostics Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>System Diagnostics</span>
              <Button
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
                size="sm"
                variant="outline"
              >
                {isRunningDiagnostics ? 'Running...' : 'Refresh'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DiagnosticItem
              label="HTTPS/Secure Context"
              status={diagnostics.https}
              icon={diagnostics.https ? CheckCircle : XCircle}
              description="Required for WebRTC in production"
            />
            <DiagnosticItem
              label="WebRTC Support"
              status={diagnostics.webrtc}
              icon={diagnostics.webrtc ? CheckCircle : XCircle}
              description="Browser supports WebRTC APIs"
            />
            <DiagnosticItem
              label="Microphone Access"
              status={diagnostics.microphone}
              icon={Mic}
              description="Can access microphone for audio calls"
            />
            <DiagnosticItem
              label="Pusher Connection"
              status={diagnostics.pusher}
              icon={Wifi}
              description="Real-time signaling service"
            />

            {!allDiagnosticsPassed && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Issues Detected:</h4>
                <ul className="text-app-text text-yellow-700 space-y-1">
                  {!diagnostics.https && <li>• HTTPS is required for WebRTC in production environments</li>}
                  {!diagnostics.webrtc && <li>• Your browser doesn't support WebRTC</li>}
                  {!diagnostics.microphone && <li>• Microphone access is required for voice calls</li>}
                  {!diagnostics.pusher && <li>• Real-time signaling is not working</li>}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Email:</strong> {session?.user?.email}</p>
            <p><strong>Name:</strong> {session?.user?.name}</p>
          </CardContent>
        </Card>

        {/* Call Test Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Call Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block text-app-text font-medium mb-2">Select User to Call:</label>
              <select
                className="w-full p-2 border rounded-lg"
                onChange={(e) => setSelectedUser(e.target.value)}
                value={selectedUser || ''}
                disabled={!allDiagnosticsPassed}
              >
                <option value="">-- Select a user --</option>
                {users.map(user => (
                  <option key={user._id} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {!allDiagnosticsPassed && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                Please resolve the diagnostic issues above before testing calls.
              </div>
            )}

            {selectedUser && allDiagnosticsPassed && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="mb-4">Testing call with: <strong>{selectedUser}</strong></p>
                <SimpleCall
                  myEmail={session.user.email}
                  otherEmail={selectedUser}
                  pusher={pusherRef.current}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-app-text">
              <li>Ensure all diagnostics pass (green checkmarks above)</li>
              <li>Open this page in 2 different browsers or devices</li>
              <li>Login as different users in each browser</li>
              <li>In Browser 1: Select the user from Browser 2 and click "Call"</li>
              <li>In Browser 2: Accept the incoming call notification</li>
              <li>You should hear each other speaking!</li>
              <li>Check browser console (F12) for detailed logs</li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-1">Troubleshooting Tips:</h4>
              <ul className="text-app-text text-blue-700 space-y-1">
                <li>• Make sure microphone permissions are granted</li>
                <li>• Try different browsers (Chrome, Firefox, Safari)</li>
                <li>• Check if you're on the same network or different networks</li>
                <li>• For production, ensure HTTPS is enabled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

