import Pusher from 'pusher';

let pusher;
try {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
    useTLS: true,
  });
} catch (err) {
  console.error('Failed to initialize Pusher:', err.message);
  pusher = {
    trigger: async () => {
      console.warn('Pusher not available, skipping event trigger');
    },
  };
}

export default pusher;
