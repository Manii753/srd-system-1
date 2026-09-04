'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { 
  MessageSquare, 
  Users, 
  Send, 
  Search,
  Plus,
  User,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  CheckCheck,
  ArrowLeft,
  Mic,
  X,
  Check,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import SimpleCall from '@/components/SimpleCall';
import { useToast } from '@/lib/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState(() => {
    // Load from localStorage on mount for instant display
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('chat_messages');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached messages:', e);
        }
      }
    }
    return [];
  });
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingMode, setRecordingMode] = useState('voice'); // 'voice' or 'transcribe'
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null); // {from, type, offer}
  const [isRinging, setIsRinging] = useState(false);
  const [showSRDPicker, setShowSRDPicker] = useState(false);
  const [srds, setSrds] = useState([]);
  const [selectedSRD, setSelectedSRD] = useState(null);
  const messagesEndRef = useRef(null);
  const pusherRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const callTimerRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const selectedConversationRef = useRef(null);
  
  // Group creation state
  const [newGroup, setNewGroup] = useState({
    name: '',
    members: [],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation, messages]);

  // No sync effect needed - messages are added instantly via Pusher and local state

  // Real-time messaging with Pusher
  useEffect(() => {
    if (!session?.user?.email) return;

    const setupPusher = async () => {
      const Pusher = (await import('pusher-js')).default;
      
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });

      pusherRef.current = pusher;

      // Subscribe to user's personal channel
      const userChannel = pusher.subscribe(`user-${session.user.email}`);

      userChannel.bind('new-message', (data) => {
        console.log('📨 New message received:', data.message);
        
        const currentConv = selectedConversationRef.current;
        const isOwnMessage = data.message.sender.email === session.user.email;
        
        // Check if message is relevant to current conversation
        const isRelevant = currentConv && (
          (currentConv.type === 'direct' && 
           ((data.message.sender._id === currentConv.user?._id) ||
            (data.message.sender.email === currentConv.user?.email) ||
            (data.message.recipient?._id === currentConv.user?._id) ||
            (data.message.recipient?.email === currentConv.user?.email))) ||
          (currentConv.type === 'department' && 
           data.message.department === currentConv.department) ||
          (currentConv.type === 'group' && 
           data.message.groupId === currentConv.group?._id)
        );
        
        if (isRelevant) {
          setSelectedConversation(prev => {
            // Check if already exists
            const exists = prev.messages.some(m => m._id === data.message._id);
            if (exists) return prev;
            
            // If it's our own message, replace temp version
            if (isOwnMessage) {
              const tempIndex = prev.messages.findIndex(m => 
                m.localOnly && 
                m.content === data.message.content &&
                Math.abs(new Date(m.createdAt) - new Date(data.message.createdAt)) < 10000
              );
              
              if (tempIndex !== -1) {
                const newMessages = [...prev.messages];
                newMessages[tempIndex] = { ...data.message, sent: true };
                return { ...prev, messages: newMessages };
              }
            }
            
            // INSTANT: Add incoming message immediately
            return {
              ...prev,
              messages: [...prev.messages, data.message]
            };
          });
        }
        
        // INSTANT: Add to global messages for sidebar
        setMessages(prev => {
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          
          // Replace temp if it's our own message
          if (isOwnMessage) {
            const tempIndex = prev.findIndex(m => 
              m.localOnly && 
              m.content === data.message.content &&
              Math.abs(new Date(m.createdAt) - new Date(data.message.createdAt)) < 10000
            );
            
            if (tempIndex !== -1) {
              const newMessages = [...prev];
              newMessages[tempIndex] = { ...data.message, sent: true };
              return newMessages;
            }
          }
          
          return [...prev, data.message];
        });
        
        // Show toast for incoming messages from others
        if (!isOwnMessage) {
          const isVoice = data.message.attachments && data.message.attachments.length > 0;
          toast({
            title: `New message from ${data.message.sender.name}`,
            description: isVoice ? '🎤 Voice message' : data.message.content.substring(0, 50) + '...',
          });
        }
      });

      // Listen for message read events
      userChannel.bind('message-read', (data) => {
        console.log('Message read:', data);
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, readBy: [...(msg.readBy || []), data.readBy] }
            : msg
        ));
      });

      // Subscribe to presence channel for online status
      const presenceChannel = pusher.subscribe('presence');
      presenceChannel.bind('status-change', (data) => {
        console.log('Status change:', data);
        setUserStatuses(prev => ({
          ...prev,
          [data.email]: {
            status: data.status,
            lastSeen: data.lastSeen,
          }
        }));
      });

      // WebRTC Call Signaling
      userChannel.bind('call-offer', async (data) => {
        console.log('Received call offer from:', data.from);
        
        // Find caller info
        const caller = users.find(u => u.email === data.from) || { name: data.from, email: data.from };
        
        // Show WhatsApp-style incoming call notification
        setIncomingCall({
          from: caller,
          type: data.callType || data.type,
          offer: data.offer,
          fromEmail: data.from,
        });
        setIsRinging(true);
        
        // Play ringtone (optional)
        const audio = new Audio('/ringtone.mp3');
        audio.loop = true;
        audio.play().catch(e => console.log('Ringtone play failed:', e));
        
        // Store audio reference to stop later
        window.ringtoneAudio = audio;
      });

      userChannel.bind('call-answer', async (data) => {
        console.log('Received call answer from:', data.from);
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            
            // Process any pending ICE candidates
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log('Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
              for (const candidate of pendingIceCandidatesRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              }
              pendingIceCandidatesRef.current = [];
            }
          } catch (error) {
            console.error('Error setting remote description:', error);
          }
        }
      });

      userChannel.bind('ice-candidate', async (data) => {
        console.log('Received ICE candidate from:', data.from);
        if (peerConnectionRef.current && data.candidate) {
          try {
            // Check if remote description is set
            if (peerConnectionRef.current.remoteDescription) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              // Queue the candidate until remote description is set
              console.log('Queueing ICE candidate until remote description is set');
              pendingIceCandidatesRef.current.push(data.candidate);
            }
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });

      userChannel.bind('call-end', () => {
        console.log('Call ended by remote user');
        endCall();
      });

      userChannel.bind('call-rejected', () => {
        console.log('Call rejected by remote user');
        toast({
          title: 'Call Rejected',
          description: 'The user declined your call',
          variant: 'destructive',
        });
        endCall();
      });
    };

    setupPusher();

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [session, toast]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchMessages();
    fetchUsers();
    fetchSRDs();
    updateOnlineStatus('online');

    // Update status on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus('away');
      } else {
        updateOnlineStatus('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus('offline');
    };
  }, [session, status, router, activeTab]);

  const fetchSRDs = async () => {
    try {
      const response = await fetch('/api/srd?limit=500');
      const data = await response.json();
      if (data.success) {
        setSrds(data.data);
      }
    } catch (error) {
      console.error('Error fetching SRDs:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const typeParam = activeTab === 'all' ? '' : `?type=${activeTab}`;
      const response = await fetch(`/api/messages${typeParam}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=100');
      const data = await response.json();

      if (data.success) {
        const usersToUse = data.data || [];
        const filteredUsers = usersToUse.filter(u => u.email !== session.user.email);
        setUsers(filteredUsers);

        // Initialize user statuses
        const statuses = {};
        filteredUsers.forEach(user => {
          statuses[user.email] = {
            status: user.onlineStatus || 'offline',
            lastSeen: user.lastSeen,
          };
        });
        setUserStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const updateOnlineStatus = async (status) => {
    try {
      await fetch('/api/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const groupMessagesByConversation = (msgs) => {
    if (!session?.user?.id) return [];
    
    const conversations = {};
    
    msgs.forEach(msg => {
      let key;
      
      if (msg.type === 'direct') {
        const otherUserId = msg.sender._id === session.user.id 
          ? msg.recipient?._id 
          : msg.sender._id;
        key = `direct-${otherUserId}`;
      } else {
        key = `department-${msg.department}`;
      }
      
      if (!conversations[key]) {
        conversations[key] = {
          key,
          type: msg.type,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        };
        
        if (msg.type === 'direct') {
          conversations[key].user = msg.sender._id === session.user.id 
            ? msg.recipient 
            : msg.sender;
        } else {
          conversations[key].department = msg.department;
        }
      }
      
      conversations[key].messages.push(msg);
      
      if (msg.createdAt > conversations[key].lastMessage.createdAt) {
        conversations[key].lastMessage = msg;
      }
    });
    
    return Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        msg.content.toLowerCase().includes(searchLower) ||
        msg.subject?.toLowerCase().includes(searchLower) ||
        msg.sender?.name.toLowerCase().includes(searchLower) ||
        msg.recipient?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [messages, searchTerm]);

  const conversations = useMemo(() => {
    return groupMessagesByConversation(filteredMessages);
  }, [filteredMessages, session?.user?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const handleSendQuickMessage = async () => {
    if ((!messageInput.trim() && !selectedSRD) || !selectedConversation) return;

    const messageContent = messageInput.trim() || '📎 Shared an SRD';
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create instant local message
    const instantMessage = {
      _id: tempId,
      content: messageContent,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      recipient: selectedConversation.type === 'direct' ? selectedConversation.user : null,
      department: selectedConversation.type === 'department' ? selectedConversation.department : null,
      type: selectedConversation.type,
      createdAt: new Date().toISOString(),
      readBy: [],
      srd: selectedSRD || null,
      localOnly: true, // Flag for instant display
    };

    // INSTANT: Add to conversation state immediately
    setSelectedConversation(prev => ({
      ...prev,
      messages: [...prev.messages, instantMessage]
    }));
    
    // INSTANT: Add to global messages for sidebar update
    setMessages(prev => [...prev, instantMessage]);
    
    // Clear input immediately
    setMessageInput('');
    setSelectedSRD(null);

    // BACKGROUND: Send to backend (don't await, fire and forget)
    const messageData = {
      type: selectedConversation.type,
      content: messageContent,
    };

    if (selectedConversation.type === 'direct') {
      messageData.recipientId = selectedConversation.user._id;
    } else {
      messageData.department = selectedConversation.department;
    }

    if (selectedSRD) {
      messageData.srdId = selectedSRD._id;
    }

    // Send in background
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Replace temp with real message
          setSelectedConversation(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg._id === tempId ? { ...data.data, sent: true } : msg
            )
          }));
          
          setMessages(prev => 
            prev.map(msg => 
              msg._id === tempId ? { ...data.data, sent: true } : msg
            )
          );
        } else {
          // Mark as failed
          setSelectedConversation(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg._id === tempId ? { ...msg, failed: true, localOnly: false } : msg
            )
          }));
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        // Mark as failed
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg._id === tempId ? { ...msg, failed: true, localOnly: false } : msg
          )
        }));
      });
  };

  const refreshUnreadCount = () => {
    // Trigger a custom event to refresh unread count in sidebar
    window.dispatchEvent(new Event('refreshUnreadCount'));
  };

  const markMessagesAsRead = async (conversationMessages) => {
    try {
      // Get unread messages in this conversation
      const unreadMessages = conversationMessages.filter(msg => 
        msg.sender._id !== session.user.id &&
        msg.sender.email !== session.user.email &&
        !msg.readBy?.some(r => r.user === session.user.id || r.user?.toString() === session.user.id)
      );

      // Mark each as read
      for (const msg of unreadMessages) {
        await fetch(`/api/messages/${msg._id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Refresh unread count after marking as read
      if (unreadMessages.length > 0) {
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const startConversation = (type, target, existingConversation = null) => {
    let conversation;
    
    if (existingConversation) {
      // Use existing conversation data from sidebar (already has messages)
      conversation = existingConversation;
    } else if (type === 'direct') {
      // Build new conversation if not in list yet
      const conversationMessages = messages.filter(m => 
        m.type === 'direct' && 
        ((m.sender._id === session.user.id && m.recipient?._id === target._id) ||
         (m.sender._id === target._id && m.recipient?._id === session.user.id))
      );
      
      conversation = {
        key: `direct-${target._id}`,
        type: 'direct',
        user: target,
        messages: conversationMessages,
      };
    } else if (type === 'group') {
      const conversationMessages = messages.filter(m => m.type === 'group' && m.groupId === target._id);
      
      conversation = {
        key: `group-${target._id}`,
        type: 'group',
        group: target,
        messages: conversationMessages,
      };
    }
    
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;
    
    // Mark messages as read
    if (conversation?.messages) {
      markMessagesAsRead(conversation.messages);
    }
  };

  // Voice recording functions with transcription
  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      console.log('Microphone access granted');
      
      // Check for supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';
      
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Start speech recognition for transcription (only in transcribe mode)
      if (recordingMode === 'transcribe' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage; // Use selected language
        
        let finalTranscript = '';
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscription(finalTranscript + interimTranscript);
          setIsTranscribing(true);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsTranscribing(false);
        };
        
        recognition.onend = () => {
          setIsTranscribing(false);
        };
        
        recognition.start();
        mediaRecorderRef.current.recognition = recognition;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob created:', audioBlob.size, 'bytes');
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Stop speech recognition
        if (mediaRecorder.recognition) {
          mediaRecorder.recognition.stop();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: 'Recording Error',
          description: 'Failed to record audio',
          variant: 'destructive',
        });
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log('Recording started');
      
      toast({
        title: 'Recording',
        description: 'Voice recording started with transcription',
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Error',
        description: error.message || 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.recognition) {
        mediaRecorderRef.current.recognition.stop();
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      setTranscription('');
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !selectedConversation) return;

    setIsSending(true);

    try {
      // Upload audio file to server first
      const formData = new FormData();
      formData.append('file', audioBlob, `voice_${Date.now()}.webm`);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload audio');
      }

      // Send message with uploaded audio URL
      const messageData = {
        type: selectedConversation.type,
        content: recordingMode === 'transcribe' && transcription ? transcription : '🎤 Voice message',
        isVoice: recordingMode === 'voice', // Only mark as voice if in voice mode
        transcription: transcription || null,
        transcriptionLanguage: selectedLanguage,
        attachments: recordingMode === 'voice' ? [{
          type: 'audio',
          url: uploadData.url, // Use uploaded file URL
          mimeType: uploadData.mimeType,
          size: uploadData.size,
        }] : [],
      };

      if (selectedConversation.type === 'direct') {
        messageData.recipientId = selectedConversation.user._id;
      } else if (selectedConversation.type === 'group') {
        messageData.groupId = selectedConversation.group._id;
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setAudioBlob(null);
        setTranscription('');
        setIsTranscribing(false);
        audioChunksRef.current = [];
        toast({
          title: 'Voice message sent',
          description: transcription ? 'Voice message with transcription delivered' : 'Your voice message has been delivered',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send voice message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send voice message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim() || newGroup.members.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter a group name and select members',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });

      const data = await response.json();

      if (data.success) {
        setGroups(prev => [...prev, data.data]);
        setShowCreateGroupDialog(false);
        setNewGroup({ name: '', members: [] });
        toast({
          title: 'Success',
          description: 'Group created successfully',
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    }
  };

  const startCall = async (type) => {
    try {
      setCallType(type);
      setShowCallDialog(true);
      setCallDuration(0);

      // Get user media with proper constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection with better STUN/TURN servers
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, 'enabled:', track.enabled, 'muted:', track.muted, 'readyState:', track.readyState);
        const sender = peerConnection.addTrack(track, stream);
        console.log('Track added, sender:', sender);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('🎵 Received remote track:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          streams: event.streams.length
        });
        
        const [remoteStream] = event.streams;
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted
        })));
        
        setRemoteStream(remoteStream);
        
        // Automatically play remote audio/video
        if (remoteVideoRef.current) {
          console.log('Setting remote stream to element');
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.volume = 1.0;
          remoteVideoRef.current.muted = false;
          
          // Log audio element state
          console.log('Audio element:', {
            volume: remoteVideoRef.current.volume,
            muted: remoteVideoRef.current.muted,
            paused: remoteVideoRef.current.paused
          });
          
          // Force play with retry
          const playAttempt = () => {
            remoteVideoRef.current?.play()
              .then(() => {
                console.log('✅ Remote stream playing successfully');
                console.log('Audio playing:', !remoteVideoRef.current.paused);
              })
              .catch(e => {
                console.log('❌ Remote play error:', e);
                setTimeout(playAttempt, 500);
              });
          };
          playAttempt();
        }
      };

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          toast({
            title: 'Call Connected',
            description: 'You are now connected',
          });
        } else if (peerConnection.connectionState === 'failed') {
          toast({
            title: 'Connection Failed',
            description: 'Call connection failed. Please try again.',
            variant: 'destructive',
          });
          endCall();
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          await fetch('/api/webrtc/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedConversation.user.email,
              type: 'ice-candidate',
              candidate: event.candidate,
            }),
          });
        }
      };

      // Create and send offer with proper options
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      // Send offer via API
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.user.email,
          type: 'call-offer',
          offer: offer,
          callType: type,
        }),
      });

      setIsInCall(true);

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      toast({
        title: type === 'voice' ? 'Voice Call Started' : 'Video Call Started',
        description: `Calling ${selectedConversation.user?.name}...`,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call Error',
        description: error.message || 'Could not start call. Please check permissions.',
        variant: 'destructive',
      });
      endCall();
    }
  };

  const endCall = async () => {
    // Stop timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear pending ICE candidates
    pendingIceCandidatesRef.current = [];

    // Send end call signal via API
    if (selectedConversation?.user?.email) {
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.user.email,
          type: 'call-end',
        }),
      });
    }

    const duration = callDuration;
    
    setIsInCall(false);
    setShowCallDialog(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);

    toast({
      title: 'Call Ended',
      description: duration > 0 ? `Call duration: ${formatDuration(duration)}` : 'Call ended',
    });
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    // Stop ringtone
    if (window.ringtoneAudio) {
      window.ringtoneAudio.pause();
      window.ringtoneAudio = null;
    }
    
    setIsRinging(false);
    
    try {
      setCallType(incomingCall.type);
      setShowCallDialog(true);
      
      // Get user media with proper constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: incomingCall.type === 'video' ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current && incomingCall.type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      
      // Create peer connection with better STUN/TURN servers
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, 'enabled:', track.enabled, 'muted:', track.muted, 'readyState:', track.readyState);
        const sender = peerConnection.addTrack(track, stream);
        console.log('Track added, sender:', sender);
      });
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        
        // Automatically play remote audio/video
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.volume = 1.0; // Full volume
          remoteVideoRef.current.muted = false; // Not muted
          
          // Play with retry
          const playPromise = remoteVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('Remote stream playing'))
              .catch(e => {
                console.log('Remote play error:', e);
                // Retry after a short delay
                setTimeout(() => {
                  remoteVideoRef.current?.play().catch(err => console.log('Retry failed:', err));
                }, 500);
              });
          }
        }
      };
      
      // Handle connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };
      
      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          await fetch('/api/webrtc/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: incomingCall.from.email,
              type: 'ice-candidate',
              candidate: event.candidate,
            }),
          });
        }
      };
      
      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      
      // Process any pending ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log('Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding queued ICE candidate:', error);
          }
        }
        pendingIceCandidatesRef.current = [];
      }
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer via API
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: incomingCall.from.email,
          type: 'call-answer',
          answer: answer,
        }),
      });
      
      setIsInCall(true);
      setIncomingCall(null);
      
      // Start timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: 'Call Connected',
        description: `Connected with ${incomingCall.from.name}`,
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Call Error',
        description: error.message || 'Could not accept call',
        variant: 'destructive',
      });
      rejectIncomingCall();
    }
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    
    // Stop ringtone
    if (window.ringtoneAudio) {
      window.ringtoneAudio.pause();
      window.ringtoneAudio = null;
    }
    
    setIsRinging(false);
    
    // Send rejection signal
    await fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: incomingCall.from.email,
        type: 'call-rejected',
      }),
    });
    
    setIncomingCall(null);
    
    toast({
      title: 'Call Declined',
      description: 'You declined the call',
    });
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
        {/* Sidebar - Conversations List */}
        <div className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all",
          selectedConversation ? "w-0 md:w-96 overflow-hidden md:overflow-visible" : "w-full md:w-96"
        )}>
          {/* Sidebar Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-app-heading font-bold text-gray-900">Messages</h1>
              <Button 
                onClick={() => setShowCreateGroupDialog(true)}
                size="sm"
                className="rounded-full w-10 h-10 p-0"
                title="Create Group"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-gray-100 border-0 focus:bg-white"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-3">
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={activeTab === 'direct' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('direct')}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-1" />
                DMs
              </Button>
              <Button
                variant={activeTab === 'department' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('department')}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-1" />
                Groups
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Groups Section */}
              {groups.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-app-heading font-semibold text-gray-500 uppercase mb-3 px-2">Groups</h3>
                  <div className="space-y-1">
                    {groups.map(group => {
                      const groupConversation = conversations.find(c => c.type === 'group' && c.group?._id === group._id);
                      const isActive = selectedConversation?.group?._id === group._id;
                      
                      return (
                        <div
                          key={group._id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            isActive ? "bg-blue-50" : "hover:bg-gray-50"
                          )}
                          onClick={() => startConversation('group', group, groupConversation)}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-app-heading font-semibold text-gray-900">{group.name}</p>
                            <p className="text-app-text text-gray-500">{group.members.length} members</p>
                          </div>
                          {groupConversation && groupConversation.unreadCount > 0 && (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-app-heading font-bold flex-shrink-0">
                              {groupConversation.unreadCount}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Users Section */}
              <div>
                <h3 className="text-app-heading font-semibold text-gray-500 uppercase mb-3 px-2">Contacts</h3>
                <div className="space-y-1">
                  {users.map(user => {
                    const userConversation = conversations.find(c => c.type === 'direct' && c.user?._id === user._id);
                    const isActive = selectedConversation?.user?._id === user._id;
                    
                    return (
                      <div
                        key={user._id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          isActive ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                        onClick={() => startConversation('direct', user, userConversation)}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-app-heading">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          {userStatuses[user.email]?.status === 'online' && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                          {userStatuses[user.email]?.status === 'away' && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-yellow-500 rounded-full border-2 border-white"></div>
                          )}
                          {userStatuses[user.email]?.status === 'offline' && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-app-heading font-semibold text-gray-900 truncate">{user.name}</p>
                          {userConversation ? (
                            <p className="text-app-text text-gray-500 truncate">
                              {userConversation.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-app-text text-gray-500">{user.role}</p>
                          )}
                        </div>
                        {userConversation && userConversation.unreadCount > 0 && (
                          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-app-heading font-bold flex-shrink-0">
                            {userConversation.unreadCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  {selectedConversation.type === 'direct' ? (
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {selectedConversation.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      {userStatuses[selectedConversation.user?.email]?.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                      {userStatuses[selectedConversation.user?.email]?.status === 'away' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></div>
                      )}
                      {userStatuses[selectedConversation.user?.email]?.status === 'offline' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  )}
                  
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.type === 'direct'
                        ? selectedConversation.user?.name
                        : `${selectedConversation.department?.toUpperCase()} Department`}
                    </h2>
                    <p className="text-app-text text-gray-500">
                      {selectedConversation.type === 'direct'
                        ? userStatuses[selectedConversation.user?.email]?.status === 'online'
                          ? '🟢 Online'
                          : userStatuses[selectedConversation.user?.email]?.status === 'away'
                          ? '🟡 Away'
                          : '⚫ Offline'
                        : `${selectedConversation.messages.length} members`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full w-9 h-9 p-0 hover:bg-green-50"
                    onClick={() => startCall('voice')}
                    title="Voice Call"
                  >
                    <Phone className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full w-9 h-9 p-0 hover:bg-blue-50"
                    onClick={() => startCall('video')}
                    title="Video Call"
                  >
                    <Video className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Simple Call Component - Only for direct conversations */}
              {selectedConversation.type === 'direct' && (
                <div className="px-4 py-2 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-app-text font-medium text-gray-700">Quick Call</span>
                    <SimpleCall 
                      myEmail={session?.user?.email}
                      otherEmail={selectedConversation.user?.email}
                      pusher={pusherRef.current}
                    />
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  (() => {
                    // Deduplicate messages before rendering
                    const messageMap = new Map();
                    selectedConversation.messages.forEach(m => {
                      const existing = messageMap.get(m._id);
                      // Keep the most complete version (not temp, has more data)
                      if (!existing || (m._id.indexOf('temp-') === -1 && existing._id.indexOf('temp-') !== -1)) {
                        messageMap.set(m._id, m);
                      }
                    });
                    const uniqueMessages = Array.from(messageMap.values());
                    
                    return [...uniqueMessages].reverse().map((msg, idx) => {
                    const isOwn = msg.sender._id === session.user.id || msg.sender.email === session.user.email;
                    const showAvatar = idx === 0 || [...uniqueMessages].reverse()[idx - 1]?.sender._id !== msg.sender._id;
                    const msgTime = new Date(msg.createdAt);
                    
                    // Message status
                    const isLocalOnly = msg.localOnly; // Just sent, not confirmed yet
                    const isFailed = msg.failed; // Failed to send
                    const isSent = msg.sent || (!msg.localOnly && !msg.failed); // Confirmed by server
                    const isRead = msg.readBy && msg.readBy.some(r => 
                      r.user && r.user.toString() !== session.user.id && r.user.toString() !== msg.sender._id?.toString()
                    );
                    


                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          "flex gap-2",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-app-heading font-semibold">
                                {msg.sender.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm transition-all",
                          isOwn 
                            ? isFailed
                              ? "bg-red-400 text-white rounded-br-sm" // Red when failed
                              : isLocalOnly
                              ? "bg-blue-400 text-white rounded-br-sm opacity-90" // Light blue when sending
                              : isRead
                              ? "bg-blue-600 text-white rounded-br-sm" // Darker blue when read
                              : "bg-blue-500 text-white rounded-br-sm" // Normal blue when sent
                            : "bg-white text-gray-900 rounded-bl-sm"
                        )}>
                          {!isOwn && showAvatar && (
                            <p className="text-app-heading font-semibold mb-1 opacity-70">
                              {msg.sender.name}
                            </p>
                          )}
                          
                          {/* Voice message */}
                          {(msg.isVoice || msg.content?.includes('🎤')) && msg.attachments && msg.attachments.length > 0 ? (
                            <div className="space-y-2 min-w-[250px]">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  isOwn ? "bg-blue-600" : "bg-gray-200"
                                )}>
                                  <Mic className={cn("h-4 w-4", isOwn ? "text-white" : "text-gray-600")} />
                                </div>
                                <audio 
                                  controls 
                                  preload="auto"
                                  controlsList="nodownload"
                                  className="flex-1"
                                  src={
                                    typeof msg.attachments[0] === 'string' 
                                      ? msg.attachments[0] 
                                      : msg.attachments[0]?.url || msg.attachments[0]
                                  }
                                  style={{ 
                                    height: '36px',
                                    maxWidth: '100%',
                                    filter: isOwn ? 'invert(1) brightness(2)' : 'none'
                                  }}
                                  onError={(e) => {
                                    console.error('Audio playback error:', e);
                                    console.log('Audio src:', e.target.src);
                                  }}
                                />
                              </div>
                              {msg.transcription && (
                                <div className={cn(
                                  "text-app-text italic px-2 py-1 rounded",
                                  isOwn ? "bg-blue-600 bg-opacity-50 text-blue-50" : "bg-gray-100 text-gray-600"
                                )}>
                                  <span className="font-semibold">📝 </span>
                                  {msg.transcription}
                                </div>
                              )}
                            </div>
                          ) : msg.srd ? (
                            /* SRD Reference */
                            <div>
                              <p className="text-app-text break-words whitespace-pre-wrap mb-2">
                                {msg.content}
                              </p>
                              <Link 
                                href={`/srd/${msg.srd._id}`}
                                className={cn(
                                  "block p-3 rounded-lg border-2 hover:shadow-md transition-all",
                                  isOwn ? "bg-blue-600 border-blue-400" : "bg-white border-gray-200"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className={cn("h-4 w-4", isOwn ? "text-blue-100" : "text-blue-600")} />
                                  <span className={cn("text-app-heading font-semibold", isOwn ? "text-blue-100" : "text-gray-500")}>
                                    SRD Reference
                                  </span>
                                </div>
                                <p className={cn("font-semibold text-app-heading", isOwn ? "text-white" : "text-gray-900")}>
                                  {msg.srd.refNo}
                                </p>
                                <p className={cn("text-app-text mt-1", isOwn ? "text-blue-100" : "text-gray-600")}>
                                  {msg.srd.title}
                                </p>
                              </Link>
                            </div>
                          ) : (
                            <p className="text-app-text break-words whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-app-text",
                            isOwn ? "text-blue-100 justify-end" : "text-gray-500"
                          )}>
                            <span>
                              {msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              isFailed ? (
                                <span className="text-red-200 text-app-text">Failed</span>
                              ) : isLocalOnly ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isRead ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-200" />
                              ) : isSent ? (
                                <CheckCheck className="h-3.5 w-3.5 text-white opacity-70" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-white opacity-70" />
                              )
                            )}
                          </div>
                        </div>

                        {isOwn && <div className="w-8" />}
                      </div>
                    );
                    });
                  })()
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                {audioBlob ? (
                  /* Voice message preview */
                  <div className="bg-blue-50 rounded-3xl px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Mic className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-app-text font-medium text-gray-900">Voice message ready</p>
                          <audio controls className="w-full mt-1" src={URL.createObjectURL(audioBlob)} />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAudioBlob(null);
                          setTranscription('');
                        }}
                        className="rounded-full w-8 h-8 p-0"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </Button>
                      <Button
                        onClick={sendVoiceMessage}
                        disabled={isSending}
                        className="rounded-full w-10 h-10 p-0"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                    {transcription && (
                      <div className="bg-white rounded-lg px-3 py-2 text-app-text text-gray-700">
                        <span className="font-semibold text-blue-600">Transcription: </span>
                        {transcription}
                      </div>
                    )}
                  </div>
                ) : isRecording ? (
                  /* Recording indicator */
                  <div className="bg-red-50 rounded-3xl px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-app-text font-medium text-red-600">
                          {recordingMode === 'voice' ? 'Recording Voice...' : 'Recording for Text...'}
                        </p>
                        {recordingMode === 'transcribe' && (
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="text-app-text px-2 py-1 rounded border"
                          >
                            <option value="en-US">English</option>
                            <option value="hi-IN">Hindi</option>
                            <option value="ur-PK">Urdu</option>
                            <option value="pa-IN">Punjabi</option>
                          </select>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelRecording}
                        className="rounded-full w-8 h-8 p-0"
                      >
                        <X className="h-5 w-5 text-red-500" />
                      </Button>
                      <Button
                        onClick={stopRecording}
                        className="rounded-full w-10 h-10 p-0 bg-red-500 hover:bg-red-600"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    </div>
                    {isTranscribing && transcription && (
                      <div className="bg-white rounded-lg px-3 py-2 text-app-text text-gray-700">
                        <span className="font-semibold text-red-600">Live: </span>
                        {transcription}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Normal input */
                  <div className="flex flex-col gap-2">
                    {/* SRD Reference Preview */}
                    {selectedSRD && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-app-heading font-semibold text-blue-900">{selectedSRD.refNo}</p>
                            <p className="text-app-text text-blue-700">{selectedSRD.title}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSRD(null)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full w-9 h-9 p-0 flex-shrink-0"
                        onClick={() => setShowSRDPicker(true)}
                        title="Attach SRD"
                      >
                        <FileText className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2 flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0">
                        <Smile className="h-5 w-5 text-gray-500" />
                      </Button>
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendQuickMessage();
                          }
                        }}
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                      />
                      <Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0">
                        <Paperclip className="h-5 w-5 text-gray-500" />
                      </Button>
                    </div>

                    {messageInput.trim() || selectedSRD ? (
                      <Button 
                        onClick={handleSendQuickMessage}
                        disabled={isSending}
                        className="rounded-full w-10 h-10 p-0 flex-shrink-0"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setRecordingMode('transcribe');
                            startRecording();
                          }}
                          className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-green-500 hover:bg-green-600"
                          title="Voice to Text (Urdu/Hindi/English)"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button 
                          onClick={() => {
                            setRecordingMode('voice');
                            startRecording();
                          }}
                          className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-blue-500 hover:bg-blue-600"
                          title="Send Voice Message"
                        >
                          <Mic className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6 shadow-lg">
                <MessageSquare className="h-16 w-16 text-blue-500" />
              </div>
              <h2 className="text-app-heading font-bold text-gray-900 mb-2">Welcome to Messages</h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Select a user or department from the sidebar to start messaging
              </p>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2 mx-auto">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-app-text text-gray-600">Direct Messages</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-2 mx-auto">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-app-text text-gray-600">Department Groups</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Call Dialog */}
        <Dialog open={showCallDialog} onOpenChange={(open) => {
          if (!open && isInCall) {
            endCall();
          } else {
            setShowCallDialog(open);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {callType === 'voice' ? '📞 Voice Call' : '📹 Video Call'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Contact Info */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-app-heading font-bold mb-4">
                  {selectedConversation?.type === 'direct' 
                    ? selectedConversation.user?.name?.charAt(0).toUpperCase()
                    : <Users className="h-12 w-12" />
                  }
                </div>
                <h3 className="text-app-heading font-semibold text-gray-900">
                  {selectedConversation?.type === 'direct' 
                    ? selectedConversation.user?.name
                    : selectedConversation?.group?.name
                  }
                </h3>
                <p className="text-app-text text-gray-500 mt-1">
                  {isInCall ? formatDuration(callDuration) : 'Calling...'}
                </p>
              </div>

              {/* Call Status */}
              <div className="flex justify-center">
                {isInCall ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-app-text font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
                    <span className="text-app-text font-medium">Connecting...</span>
                  </div>
                )}
              </div>

              {/* Video Streams (for video calls) */}
              {callType === 'video' && (
                <div className="relative">
                  {/* Remote Video */}
                  <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Video className="h-16 w-16 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-app-text">Waiting for video...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Local Video (Picture-in-Picture) */}
                  {localStream && (
                    <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Hidden audio element for voice calls */}
              {callType === 'voice' && (
                <audio
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  volume={1.0}
                  className="hidden"
                  onLoadedMetadata={(e) => {
                    console.log('Audio metadata loaded');
                    e.target.play().catch(err => console.log('Audio play error:', err));
                  }}
                />
              )}
              
              {/* Audio indicator for voice calls */}
              {callType === 'voice' && remoteStream && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse animation-delay-100" />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse animation-delay-200" />
                  </div>
                </div>
              )}

              {/* Call Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleMute}
                  className={cn(
                    "rounded-full w-14 h-14 p-0",
                    isMuted ? "bg-red-100 hover:bg-red-200" : "hover:bg-gray-100"
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <X className="h-6 w-6 text-red-600" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={toggleCamera}
                    className={cn(
                      "rounded-full w-14 h-14 p-0",
                      isCameraOff ? "bg-red-100 hover:bg-red-200" : "hover:bg-gray-100"
                    )}
                    title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                  >
                    {isCameraOff ? (
                      <X className="h-6 w-6 text-red-600" />
                    ) : (
                      <Video className="h-6 w-6" />
                    )}
                  </Button>
                )}

                <Button
                  onClick={endCall}
                  size="lg"
                  className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600"
                  title="End call"
                >
                  <Phone className="h-6 w-6 rotate-135" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* SRD Picker Dialog */}
        <Dialog open={showSRDPicker} onOpenChange={setShowSRDPicker}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select SRD to Share</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {srds.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No SRDs available</p>
                </div>
              ) : (
                srds.map(srd => (
                  <div
                    key={srd._id}
                    onClick={() => {
                      setSelectedSRD(srd);
                      setShowSRDPicker(false);
                      toast({
                        title: 'SRD Selected',
                        description: `${srd.refNo} - ${srd.title}`,
                      });
                    }}
                    className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{srd.refNo}</span>
                          <Badge variant="outline" className="text-app-text">
                            {srd.progress}%
                          </Badge>
                        </div>
                        <p className="text-app-text text-gray-700 font-medium">{srd.title}</p>
                        <p className="text-app-text text-gray-500 mt-1">{srd.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSRDPicker(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Incoming Call Notification - WhatsApp Style */}
        {incomingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-pulse-slow">
              <div className="text-center">
                {/* Caller Avatar */}
                <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-green-600 text-app-text font-bold mx-auto mb-4 shadow-lg">
                  {incomingCall.from.name?.charAt(0).toUpperCase()}
                </div>
                
                {/* Caller Info */}
                <h2 className="text-app-heading font-bold text-white mb-2">
                  {incomingCall.from.name}
                </h2>
                <p className="text-green-100 mb-1">{incomingCall.from.role}</p>
                <p className="text-white font-semibold mb-6">
                  {incomingCall.type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                </p>
                
                {/* Ringing Animation */}
                <div className="flex justify-center gap-2 mb-8">
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-center gap-6">
                  {/* Reject Button */}
                  <button
                    onClick={rejectIncomingCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all"
                  >
                    <Phone className="h-8 w-8 text-white rotate-135" />
                  </button>
                  
                  {/* Accept Button */}
                  <button
                    onClick={acceptIncomingCall}
                    className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all"
                  >
                    <Phone className="h-8 w-8 text-green-600" />
                  </button>
                </div>
                
                <p className="text-white text-app-text mt-4 opacity-80">
                  Swipe to answer
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Group Name */}
              <div>
                <label className="text-app-text font-medium">Group Name</label>
                <Input
                  type="text"
                  placeholder="Enter group name..."
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="mt-2"
                />
              </div>

              {/* Select Members */}
              <div>
                <label className="text-app-text font-medium">Select Members</label>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {users.map(user => (
                    <div key={user._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={newGroup.members.includes(user._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewGroup({ ...newGroup, members: [...newGroup.members, user._id] });
                          } else {
                            setNewGroup({ ...newGroup, members: newGroup.members.filter(id => id !== user._id) });
                          }
                        }}
                      />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-app-text font-medium">{user.name}</p>
                        <p className="text-app-text text-gray-500">{user.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-app-text text-gray-500 mt-2">
                  {newGroup.members.length} member{newGroup.members.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateGroupDialog(false);
                  setNewGroup({ name: '', members: [] });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGroup}
                disabled={!newGroup.name.trim() || newGroup.members.length === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

