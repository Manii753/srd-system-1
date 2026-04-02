'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import SimpleCall from '@/components/SimpleCall';

export default function TestCallPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
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
      const Pusher = (await import('pusher-js')).default;
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });
    };
    setupPusher();

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [session, status, router]);

  if (status === 'loading') {
    return <Layout><div>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-app-heading font-bold mb-6">Simple Call Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-app-heading font-semibold mb-4">Your Email: {session?.user?.email}</h2>
          
          <div className="mb-4">
            <label className="block text-app-text font-medium mb-2">Select User to Call:</label>
            <select 
              className="w-full p-2 border rounded"
              onChange={(e) => setSelectedUser(e.target.value)}
              value={selectedUser || ''}
            >
              <option value="">-- Select a user --</option>
              {users.map(user => (
                <option key={user._id} value={user.email}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="mb-4">Calling: <strong>{selectedUser}</strong></p>
              <SimpleCall 
                myEmail={session.user.email}
                otherEmail={selectedUser}
                pusher={pusherRef.current}
              />
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-app-text">
            <li>Open this page in 2 different browsers (or devices)</li>
            <li>Login as different users in each</li>
            <li>In Browser 1: Select the user from Browser 2 and click "Call"</li>
            <li>In Browser 2: Accept the incoming call</li>
            <li>You should hear each other!</li>
          </ol>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Console Logs:</h3>
          <p className="text-app-text">Open browser console (F12) to see detailed logs of what's happening.</p>
        </div>
      </div>
    </Layout>
  );
}

