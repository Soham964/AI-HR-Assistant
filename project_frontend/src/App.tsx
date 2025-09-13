import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  MessageSquare, 
  Search,
  Mic,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCcw,
  Share,
  Sparkles,
  User,
  Calendar,
  FileText,
  X,
  Download,
  Trash2,
  LogOut
} from 'lucide-react';
import Login from './components/Login';
import Signup from './components/Signup';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

// Environment variable for backend URL
const BACKEND_HOST = import.meta.env.BACKEND_HOST || 'http://localhost:5000';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'ats' | 'interview' | 'letter';
  data?: {
    score?: number;
    resumeInfo?: {
      name: string;
      contact: string;
      skills: string;
      education: string;
      experience: string;
    };
    categoryScores?: {
      skillsMatch: number;
      experienceRelevance: number;
      educationAlignment: number;
      keywordOptimization: number;
      overallPresentation: number;
    };
    improvementSuggestions?: string;
    jobDescription?: string;
    interviewDetails?: {
      candidateName: string;
      position: string;
      interviewDate: string;
      notes?: string;
    };
    letterUrl?: string;
  };
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

interface Interview {
  id?: string;
  candidateName: string;
  position: string;
  interviewDate: string; // ISO string format for date and time
  interviewer?: string; // MongoDB ObjectId of the interviewer employee
  notes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CallLetter {
  candidateName: string;
  position: string;
  interviewDate: string;
  interviewer: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyLinkedIn: string;
  generatedDate: string;
  letterContent: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(true); // New state to switch between login/signup
  const [showSignup, setShowSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{score?: number; error?: string} | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [interviewDetails, setInterviewDetails] = useState({
    candidateName: '',
    position: '',
    interviewDate: '',
    notes: ''
  });
  const [interviewLetter, setInterviewLetter] = useState<string | null>(null);
  const [activeATSTab, setActiveATSTab] = useState<'score' | 'resume'>('score'); // New state for ATS tabs
  const [interviewError, setInterviewError] = useState<string | null>(null); // New state for interview scheduling errors
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'conversations' | 'interviews'>('conversations');
  const [scheduledInterviews, setScheduledInterviews] = useState<Interview[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [callLetter, setCallLetter] = useState<CallLetter | null>(null);
  const [showCallLetter, setShowCallLetter] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (firebaseUser) {
      // Clear all existing data when user changes
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
      setScheduledInterviews([]);
      
      // Load user-specific data
      const employeeId = localStorage.getItem('employeeId');
      if (employeeId) {
        // Load chats
        const storedChats = localStorage.getItem(`chats_${employeeId}`);
        if (storedChats) {
          const parsedChats: Chat[] = JSON.parse(storedChats);
          setChats(parsedChats.map(chat => ({ ...chat, timestamp: new Date(chat.timestamp) })));
        }

        // Load last chat
        const lastChatId = localStorage.getItem(`lastChatId_${employeeId}`);
        if (lastChatId && storedChats) {
          const parsedChats: Chat[] = JSON.parse(storedChats);
          const lastChat = parsedChats.find(chat => chat.id === lastChatId);
          if (lastChat) {
            setCurrentChatId(lastChat.id);
            setMessages(lastChat.messages);
          }
        }

        // Load interviews
        const storedInterviews = localStorage.getItem(`scheduledInterviews_${employeeId}`);
        if (storedInterviews) {
          try {
            const parsedInterviews = JSON.parse(storedInterviews);
            setScheduledInterviews(parsedInterviews);
          } catch (error) {
            console.error('Error loading scheduled interviews:', error);
          }
        }
      }
    }
  }, [firebaseUser]); // This will run whenever the user changes

  useEffect(() => {
    // Check for token on initial load
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally, you could validate the token with a backend call here
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser);
      try {
        if (firebaseUser) {
          setUser({
            name: firebaseUser.displayName || 'No Name',
            email: firebaseUser.email || 'No Email',
          });
          setFirebaseUser(firebaseUser);
          setIsAuthenticated(true);
          localStorage.setItem('employeeId', firebaseUser.uid);
          
          firebaseUser.getIdToken().then(token => {
            localStorage.setItem('token', token);
          }).catch(error => {
            console.error('Error getting ID token:', error);
            setFirebaseError('Error getting authentication token. Please try again.');
          });
        } else {
          setUser(null);
          setFirebaseUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('employeeId');
          localStorage.removeItem('token');
          setChats([]);
          setCurrentChatId(null);
          setMessages([]);
          setScheduledInterviews([]);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setFirebaseError('Error initializing authentication. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleSelectChat = (chatId: string) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setCurrentChatId(selectedChat.id);
      setMessages(selectedChat.messages);
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) return;

    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      localStorage.removeItem(`lastChatId_${employeeId}`);
    }
  };

  const handleLoginSuccess = () => {
    // Clear all existing data from localStorage
    const employeeId = localStorage.getItem('employeeId');
    if (employeeId) {
      localStorage.removeItem(`chats_${employeeId}`);
      localStorage.removeItem(`lastChatId_${employeeId}`);
      localStorage.removeItem(`scheduledInterviews_${employeeId}`);
    }
    
    // Clear state
    setChats([]);
    setCurrentChatId(null);
    setMessages([]);
    setScheduledInterviews([]);
    setShowSignup(false);
  };

  const handleSignupSuccess = () => {
    // Clear all existing data from localStorage
    const employeeId = localStorage.getItem('employeeId');
    if (employeeId) {
      localStorage.removeItem(`chats_${employeeId}`);
      localStorage.removeItem(`lastChatId_${employeeId}`);
      localStorage.removeItem(`scheduledInterviews_${employeeId}`);
    }
    
    // Clear state
    setChats([]);
    setCurrentChatId(null);
    setMessages([]);
    setScheduledInterviews([]);
    setShowSignup(false);
  };

  const handleSwitchToSignup = () => {
    setShowLogin(false);
  };

  const handleSwitchToLogin = () => {
    setShowLogin(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const name = file.name.split('.')[0].replace(/[_-]/g, ' ');
      setCandidateName(name);
      
      const botMessage: Message = {
        id: Date.now().toString(),
        content: `I see you've uploaded ${file.name}. Please provide the job description so I can analyze the candidate's compatibility.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  const handleATSRequest = async (jobDesc: string) => {
    if (!selectedFile || !jobDesc) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('cv', selectedFile);
    formData.append('jobDescription', jobDesc);

    try {
      const response = await fetch(`${BACKEND_HOST}/api/ats/score`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ATS Response:', data); // Debug log
      setAtsScore(data.score);
      
      // Extract resume info or set default values if not available
      const resumeInfo = data.resumeInfo || {
        name: 'Not found',
        contact: 'Not found',
        skills: 'Not found',
        education: 'Not found',
        experience: 'Not found'
      };
      
      // Extract category scores if available
      const categoryScores = data.categoryScores || {
        skillsMatch: 0,
        experienceRelevance: 0,
        educationAlignment: 0,
        keywordOptimization: 0,
        overallPresentation: 0
      };
      
      // Extract improvement suggestions if available
      const improvementSuggestions = data.improvementSuggestions || '';
      
      // First show the ATS score message with resume information
      const atsMessage: Message = {
        id: Date.now().toString(),
        content: `✨ *ATS ANALYSIS RESULTS* ✨\n\nPlease use the tabs below to view the ATS score, detailed breakdown, and resume details.`,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'ats',
        data: {
          score: data.score,
          resumeInfo: resumeInfo,
          categoryScores: categoryScores,
          improvementSuggestions: improvementSuggestions,
          jobDescription: jobDesc
        }
      };

      setMessages(prev => [...prev, atsMessage]);

      // Then handle the interview scheduling based on score
      if (data.score >= 75) {
        const interviewPrompt: Message = {
          id: (Date.now() + 1).toString(),
          content: `Great news! The candidate has a strong match (${data.score}%) for this position. Would you like to schedule an interview?`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, interviewPrompt]);
        setAtsScore(data.score);
      } else {
        const lowScoreMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `The candidate's profile (${data.score}%) doesn't meet our minimum threshold of 75% for this position. Would you like to analyze another candidate?`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, lowScoreMessage]);
      }

      setSelectedFile(null);
      setJobDescription('');
      setUploadResult({ score: data.score });
    } catch (error) {
      console.error('Error in automated process:', error);
      setUploadResult({ error: 'Failed to complete the process' });
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Error: Failed to complete the process. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true); // Force refresh
        localStorage.setItem('token', token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const handleScheduleInterview = async (interviewData: Interview) => {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) {
      setInterviewError('You must be logged in to schedule an interview.');
      return;
    }

    try {
      let token = localStorage.getItem('token');
      if (!token) {
        // Try to refresh token
        token = await refreshToken();
        if (!token) {
          setInterviewError('Authentication token not found. Please log in again.');
          return;
        }
      }

      // Validate required fields
      if (!interviewData.candidateName || !interviewData.position || !interviewData.interviewDate) {
        setInterviewError('Please fill in all required fields.');
        return;
      }

      // Format the interview date to ISO string
      const formattedData = {
        ...interviewData,
        interviewDate: new Date(interviewData.interviewDate).toISOString()
      };

      const response = await fetch(`${BACKEND_HOST}/api/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If authentication failed, try refreshing token once
        if (response.status === 401 && errorData.error?.includes('Firebase ID token')) {
          console.log('Token might be expired, trying to refresh...');
          const newToken = await refreshToken();
          if (newToken) {
            // Retry the request with new token
            const retryResponse = await fetch(`${BACKEND_HOST}/api/interviews`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-auth-token': newToken,
              },
              body: JSON.stringify(formattedData),
            });
            
            if (retryResponse.ok) {
              const newInterviewData = await retryResponse.json();
              const newInterview: Interview = { ...newInterviewData, id: newInterviewData._id || newInterviewData.id };
              
              // Generate call letter after successful interview scheduling
              const callLetterResponse = await fetch(`${BACKEND_HOST}/api/interviews/${newInterview.id}/generate-call-letter`, {
                method: 'POST',
                headers: {
                  'x-auth-token': newToken,
                },
              });

              if (callLetterResponse.ok) {
                const callLetterData = await callLetterResponse.json();
                setCallLetter(callLetterData);
                setShowCallLetter(true);
              }

              // Update interviews list
              setScheduledInterviews(prev => {
                const updatedInterviews = [...prev, newInterview];
                localStorage.setItem(`scheduledInterviews_${employeeId}`, JSON.stringify(updatedInterviews));
                return updatedInterviews;
              });

              // Reset form and close it
              setShowInterviewForm(false);
              setInterviewError('');
              return;
            }
          }
        }
        
        setInterviewError(errorData.error || 'Failed to schedule interview. Please try again.');
        return;
      }

      const newInterviewData = await response.json();
      const newInterview: Interview = { ...newInterviewData, id: newInterviewData._id || newInterviewData.id };

      // Generate call letter after successful interview scheduling
      const callLetterResponse = await fetch(`${BACKEND_HOST}/api/interviews/${newInterview.id}/generate-call-letter`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
        },
      });

      if (callLetterResponse.ok) {
        const callLetterData = await callLetterResponse.json();
        setCallLetter(callLetterData);
        setShowCallLetter(true);
      }

      // Update interviews list
      setScheduledInterviews(prev => {
        const updatedInterviews = [...prev, newInterview];
        localStorage.setItem(`scheduledInterviews_${employeeId}`, JSON.stringify(updatedInterviews));
        return updatedInterviews;
      });

      // Reset form and close it
      setInterviewDetails({
        candidateName: '',
        position: '',
        interviewDate: '',
        notes: ''
      });
      setShowInterviewForm(false);
      setInterviewError(null);

      // Add success message to chat
      const successMessage: Message = {
        id: Date.now().toString(),
        content: `Interview scheduled successfully for ${interviewData.candidateName} on ${new Date(interviewData.interviewDate).toLocaleString()}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('Error scheduling interview:', error);
      setInterviewError('An unexpected error occurred while scheduling the interview. Please try again.');
    }
  };

  // Add this function to reset the form when it's closed
  const handleCloseInterviewForm = () => {
    setInterviewDetails({
      candidateName: '',
      position: '',
      interviewDate: '',
      notes: ''
    });
    setInterviewError(null);
    setShowInterviewForm(false);
  };

  const fetchAndLoadInterviews = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!firebaseUser || !token) {
      setScheduledInterviews([]); // Clear interviews if no user or token
      return;
    }

    const employeeId = localStorage.getItem('employeeId'); // This is firebaseUser.uid
    if (!employeeId) return; // Should not happen if firebaseUser exists

    try {
      // Fetch interviews from backend
      const response = await fetch(`${BACKEND_HOST}/api/interviews`, {
        headers: {
          'x-auth-token': token,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch interviews from backend:', response.status, await response.text());
        setScheduledInterviews([]); // Clear on error
        return;
      }

      const interviews: Interview[] = (await response.json()).map((interview: any) => ({
        ...interview,
        id: interview._id || interview.id, // Ensure 'id' is populated from '_id'
      }));
      setScheduledInterviews(interviews);

      // Optionally, update localStorage with data from backend
      localStorage.setItem(`scheduledInterviews_${employeeId}`, JSON.stringify(interviews));

    } catch (error) {
      console.error('Error fetching scheduled interviews:', error);
      setScheduledInterviews([]); // Clear on error
    }
  }, [firebaseUser]); // Only recreate when firebaseUser changes

  // Load scheduled interviews from backend on component mount or user change
  useEffect(() => {
    fetchAndLoadInterviews();
  }, [fetchAndLoadInterviews]); // Re-run when fetchAndLoadInterviews changes

  // Keep this effect for saving changes made *on the frontend* to localStorage
  useEffect(() => {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) return;
    localStorage.setItem(`scheduledInterviews_${employeeId}`, JSON.stringify(scheduledInterviews));
  }, [scheduledInterviews]);

  useEffect(() => {
    // Check for token on initial load
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally, you could validate the token with a backend call here
      setIsAuthenticated(true);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Update or create chat
    setChats(prevChats => {
      let updatedChats = [...prevChats];
      if (currentChatId) {
        // Find and update existing chat
        updatedChats = updatedChats.map(chat =>
          chat.id === currentChatId
            ? { ...chat, lastMessage: userMessage.content, timestamp: userMessage.timestamp, messages: newMessages }
            : chat
        );
      } else {
        // Create new chat
        const newChatId = Date.now().toString();
        const newChat: Chat = {
          id: newChatId,
          title: userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : ''), // First 30 chars as title
          lastMessage: userMessage.content,
          timestamp: userMessage.timestamp,
          messages: newMessages,
        };
        updatedChats = [newChat, ...updatedChats]; // Add new chat to the beginning
        setCurrentChatId(newChatId); // Set the new chat as current
      }
      return updatedChats;
    });

    setCurrentInput('');
    setIsTyping(true);

    try {
      // Check for greetings
      const greetingRegex = /^(hi|hello|hey|hola|good morning|good afternoon|good evening)[\s\S]*$/i;
      if (greetingRegex.test(currentInput.trim())) {
        const greetingResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: "Hello, How can I assist you today?",
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, greetingResponse]);
        setIsTyping(false);
        return; // Stop further processing for greetings
      }

      // If we have a selected file but no job description yet, treat the input as job description
      if (selectedFile && !jobDescription) {
        setJobDescription(currentInput);
        await handleATSRequest(currentInput);
        setIsTyping(false);
        return;
      }

      if (currentInput.toLowerCase().includes('what can the bot do') || currentInput.toLowerCase().includes('what can you do')) {
        const capabilitiesResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: `I am an AI HR Assistant, and here's what I can help you with:\n\n` +
            `• Leave Management\n` +
            `  - Check your leave balance\n` +
            `  - Apply for different types of leave (casual, sick, annual)\n` +
            `  - Track leave status\n\n` +
            `• Document Generation\n` +
            `  - Generate offer letters\n` +
            `  - Create experience certificates\n` +
            `  - Prepare other HR documents\n\n` +
            `• Company Policies\n` +
            `  - Answer questions about HR policies\n` +
            `  - Explain company procedures\n` +
            `  - Provide policy guidelines\n\n` +
            `• Personal Information\n` +
            `  - Update your personal details\n` +
            `  - View your profile information\n` +
            `  - Check employment details\n\n` +
            `• ATS & Recruitment\n` +
            `  - Analyze resumes for job descriptions\n` +
            `  - Get ATS compatibility scores\n` +
            `  - Schedule interviews for qualified candidates\n\n` +
            `• General HR Support\n` +
            `  - Answer HR-related queries\n` +
            `  - Provide guidance on HR processes\n` +
            `  - Assist with employee concerns`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, capabilitiesResponse]);
        setIsTyping(false);
        return;
      }

      if (currentInput.toLowerCase().includes('schedule interview') || 
          (currentInput.toLowerCase().includes('yes') && atsScore && atsScore >= 75)) {
        setShowInterviewForm(true);
        const calendarMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Please select a date and time for the interview using the calendar below.`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, calendarMessage]);
        setIsTyping(false);
        return;
      }

      const response = await fetch(`${BACKEND_HOST}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
          employeeId: localStorage.getItem('employeeId') || 'test-employee-id'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let responseContent = data.response;
      
      if (data.leaveBalance) {
        responseContent += `\n\nLeave Balance:\n` +
          `Casual: ${data.leaveBalance.casual} days\n` +
          `Sick: ${data.leaveBalance.sick} days\n` +
          `Annual: ${data.leaveBalance.annual} days`;
      }

      if (data.action === 'leave_application') {
        responseContent += `\n\nAvailable Leave Types:\n` +
          data.leaveTypes.map((type: string) => `- ${type.charAt(0).toUpperCase() + type.slice(1)}`).join('\n');
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error sending message to backend:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Error: Could not connect to the backend or receive a valid response.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [currentInput]);

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!interviewId) {
      console.error('Error: Attempted to delete an interview with an empty or invalid ID.');
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Error: Cannot delete interview. Invalid ID provided.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found');
        return;
      }

      const response = await fetch(`${BACKEND_HOST}/api/interviews/${interviewId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });

      if (response.ok) {
        // Remove the deleted interview from the state
        setScheduledInterviews(prev => prev.filter(interview => interview.id !== interviewId));
        
        // Add a success message to the chat
        const successMessage: Message = {
          id: Date.now().toString(),
          content: "Interview has been successfully deleted.",
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error('Failed to delete interview');
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Error: Failed to delete interview. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Add ProfileModal component
  const ProfileModal = ({ onClose }: { onClose: () => void }) => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-2xl font-bold mb-4">My Profile</h2>
          <p>Name: {user?.name}</p>
          <p>Email: {user?.email}</p>
          <p>Role: HR Assistant</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Close</button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
          <h2 className="text-red-400 text-xl font-semibold mb-4">Error</h2>
          <p className="text-slate-300 mb-4">{firebaseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        showLogin ? (
          <Login onLoginSuccess={handleLoginSuccess} onSwitchToSignup={handleSwitchToSignup} />
        ) : (
          <Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={handleSwitchToLogin} />
        )
      ) : (
        <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          {/* Sidebar */}
          <div className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent transition-all duration-300 ease-in-out hover:scale-105 hover:-translate-y-1">
                    AgentX
                  </h1>
                  <p className="text-xs text-slate-400">HR Assistant</p>
                </div>
              </div>
            </div>

            <div className="px-2 pt-2">
              <div className="flex flex-row border-b border-slate-700/50 bg-slate-900/80 rounded-xl overflow-hidden">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all duration-300
                    rounded-l-xl
                    ${activeSidebarTab === 'conversations'
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  onClick={() => setActiveSidebarTab('conversations')}
                >
                  <MessageSquare size={18} className={activeSidebarTab === 'conversations' ? 'text-white' : 'text-blue-400'} />
                  Recent Conversations
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all duration-300
                    rounded-r-xl
                    ${activeSidebarTab === 'interviews'
                      ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white shadow-lg scale-105'
                      : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  onClick={() => setActiveSidebarTab('interviews')}
                >
                  <Calendar size={18} className={activeSidebarTab === 'interviews' ? 'text-white' : 'text-pink-400'} />
                  Scheduled Interview
                </button>
              </div>
            </div>

            {/* Chat History or Scheduled Interviews */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {activeSidebarTab === 'conversations' ? (
                <div className="flex-1 overflow-y-auto space-y-1">
                  <button
                    className="w-full flex items-center justify-center p-2 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-600 hover:text-white transition-colors duration-200 text-sm mb-2"
                    onClick={handleNewChat}
                  >
                    <Sparkles size={16} className="mr-1" /> New Chat
                  </button>
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 group relative ${currentChatId === chat.id ? 'bg-blue-700' : 'hover:bg-gray-700'}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate text-sm">{chat.title}</h4>
                          <p className="text-xs text-gray-400 truncate">{chat.lastMessage}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatTime(chat.timestamp)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all duration-200"
                          title="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
                    Scheduled Interviews
                  </h3>
                  {scheduledInterviews.length === 0 ? (
                    <p className="text-slate-400">No interviews scheduled yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {scheduledInterviews.map((interview, idx) => (
                        <li key={idx} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                          <div><b>Candidate:</b> {interview.candidateName}</div>
                          <div><b>Position:</b> {interview.position}</div>
                          <div><b>Date & Time:</b> {new Date(interview.interviewDate).toLocaleString()}</div>
                          {interview.notes && <div><b>Notes:</b> {interview.notes}</div>}
                            </div>
                            <button
                              onClick={() => handleDeleteInterview(interview.id || '')}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
                              title="Delete interview"
                            >
                              <Trash2 size={18} className="text-red-400 group-hover:text-red-300" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-slate-800/60 backdrop-blur-xl">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent pl-4">
                Chats
              </h2>
              <div className="relative pr-4">
                <button
                  onClick={() => setShowProfileDropdown(prev => !prev)}
                  className="p-2 rounded-full transition-all duration-200 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:scale-105 shadow-lg"
                >
                  <User size={20} className="text-white" />
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-700/90 rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600/70 rounded-md transition-all duration-200"
                    >
                      <User size={16} /> My Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-red-600/70 rounded-md transition-all duration-200"
                    >
                      <LogOut size={16} /> Logout
                </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/40 rounded-xl shadow-inner-lg">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'assistant' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Sparkles size={18} className="text-white" />
                    </div>
                  )}
                  <div
                    className={
                      message.sender === 'user'
                        ? 'rounded-xl px-5 py-3 shadow-md max-w-[75%] transition-all duration-200 ease-in-out bg-gradient-to-r from-fuchsia-800 to-pink-500 text-white rounded-br-none'
                        : 'rounded-xl px-5 py-3 shadow-md max-w-[75%] transition-all duration-200 ease-in-out bg-black/40 text-white rounded-bl-none'
                    }
                  >
                    <div className="prose prose-invert text-white leading-relaxed">
                      {/* Regular message content */}
                      {!message.type && <p className="whitespace-pre-wrap">{message.content}</p>}
                      
                      {/* ATS Score content */}
                      {message.type === 'ats' && message.data?.score && (
                        <div className="mt-4 bg-slate-700/50 rounded-lg overflow-hidden">
                          {/* Tab Navigation */}
                          <div className="flex border-b border-slate-600/50">
                            <button 
                              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeATSTab === 'score' ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-600/30'}`}
                              onClick={() => setActiveATSTab('score')}
                            >
                              📊 ATS Score
                            </button>
                            <button 
                              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeATSTab === 'resume' ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-600/30'}`}
                              onClick={() => setActiveATSTab('resume')}
                            >
                              📋 Resume Details
                            </button>
                          </div>
                          
                          {/* Tab Content */}
                          <div className="p-4">
                            {activeATSTab === 'score' && (
                              <div>
                                <div className="text-center mb-4">
                                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    {message.data.score}%
                                  </div>
                                  <div className="text-sm text-slate-300 mt-2">
                                    ATS Compatibility Score
                                  </div>
                                </div>
                                
                                {/* Category Scores */}
                                {message.data.categoryScores && (
                                  <div className="mt-4 space-y-3">
                                    <h4 className="text-sm font-medium text-blue-400">Score Breakdown</h4>
                                    
                                    {/* Skills Match */}
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">Skills Match</span>
                                        <span className="text-blue-400">{message.data.categoryScores.skillsMatch}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                          style={{ width: `${message.data.categoryScores.skillsMatch}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    
                                    {/* Experience Relevance */}
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">Experience Relevance</span>
                                        <span className="text-blue-400">{message.data.categoryScores.experienceRelevance}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                          style={{ width: `${message.data.categoryScores.experienceRelevance}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    
                                    {/* Education Alignment */}
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">Education Alignment</span>
                                        <span className="text-blue-400">{message.data.categoryScores.educationAlignment}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                          style={{ width: `${message.data.categoryScores.educationAlignment}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    
                                    {/* Keyword Optimization */}
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">Keyword Optimization</span>
                                        <span className="text-blue-400">{message.data.categoryScores.keywordOptimization}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                          style={{ width: `${message.data.categoryScores.keywordOptimization}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    
                                    {/* Overall Presentation */}
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">Overall Presentation</span>
                                        <span className="text-blue-400">{message.data.categoryScores.overallPresentation}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                          style={{ width: `${message.data.categoryScores.overallPresentation}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Improvement Suggestions */}
                                {message.data.improvementSuggestions && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium text-blue-400">✨ Improvement Suggestions</h4>
                                    <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{message.data.improvementSuggestions}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {activeATSTab === 'resume' && message.data.resumeInfo && (
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-400">👤 Name</h4>
                                    <p className="text-sm text-slate-300">{message.data.resumeInfo.name || 'Not available'}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-400">📱 Contact</h4>
                                    <p className="text-sm text-slate-300">{message.data.resumeInfo.contact || 'Not available'}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-400">🔧 Technical Skills</h4>
                                    {Array.isArray(message.data.resumeInfo.skills)
                                      ? (
                                        <ul className="text-sm text-slate-300 list-disc ml-5">
                                          {message.data.resumeInfo.skills.map((skill, idx) => (
                                            <li key={idx}>
                                              {typeof skill === 'object'
                                                ? JSON.stringify(skill)
                                                : skill}
                                            </li>
                                          ))}
                                        </ul>
                                      )
                                      : <p className="text-sm text-slate-300">{message.data.resumeInfo.skills || 'Not available'}</p>
                                    }
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-400">🎓 Education</h4>
                                    <div className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">
                                      {Array.isArray(message.data?.resumeInfo?.education) ? (
                                        <ul className="list-disc ml-5">
                                          {(message.data.resumeInfo.education as Array<{ degree?: string; institution?: string; year?: string; additional?: string; }>).map((edu, idx) => (
                                            <li key={idx}>
                                              <b>{edu.degree || 'N/A'}</b> from {edu.institution || 'N/A'} ({edu.year || 'N/A'})
                                              {edu.additional && <><br/>{edu.additional}</>}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>{message.data?.resumeInfo?.education || 'Not available'}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-400">💼 Experience</h4>
                                    <div className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">
                                      {Array.isArray(message.data?.resumeInfo?.experience) ? (
                                        <ul className="list-disc ml-5">
                                          {(message.data.resumeInfo.experience as Array<{ title?: string; company?: string; duration?: string; achievements?: string; }>).map((exp, idx) => (
                                            <li key={idx}>
                                              <b>{exp.title || 'N/A'}</b> at {exp.company || 'N/A'} ({exp.duration || 'N/A'})
                                              {exp.achievements && <p className="ml-5 text-xs text-slate-400">- {exp.achievements}</p>}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>{message.data?.resumeInfo?.experience || 'Not available'}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {message.data.jobDescription && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium text-blue-400">Job Description Analyzed Against</h4>
                                    <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{message.data.jobDescription}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.type === 'interview' && message.data?.interviewDetails && (
                        <div className="mt-4 bg-slate-700/50 rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-medium text-blue-400">Interview Details</h4>
                          <p className="text-sm text-slate-300"><b>Candidate:</b> {message.data?.interviewDetails?.candidateName}</p>
                          <p className="text-sm text-slate-300"><b>Position:</b> {message.data?.interviewDetails?.position}</p>
                          <p className="text-sm text-slate-300"><b>Date:</b> {new Date(message.data?.interviewDetails?.interviewDate).toLocaleString()}</p>
                          {message.data?.interviewDetails?.notes && <p className="text-sm text-slate-300"><b>Notes:</b> {message.data.interviewDetails.notes}</p>}
                          {message.data?.letterUrl && (
                            <div className="mt-3 pt-3 border-t border-slate-600/50">
                              <h4 className="text-sm font-medium text-blue-400 mb-1">Interview Letter</h4>
                              <p className="text-sm text-slate-300 whitespace-pre-wrap">{message.data.letterUrl}</p>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(message.data?.letterUrl || '');
                                  link.download = `interview_letter_${message.data?.interviewDetails?.candidateName}.txt`;
                                  link.click();
                                }}
                                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors duration-200"
                              >
                                <Download size={16} /> Download Letter
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {message.type === 'letter' && message.data?.letterUrl && (
                        <div className="mt-4 bg-slate-700/50 rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-medium text-blue-400">Generated Document</h4>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{message.data.letterUrl}</p>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(message.data?.letterUrl || '');
                              link.download = 'document.txt';
                              link.click();
                            }}
                            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors duration-200"
                          >
                            <Download size={16} /> Download Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User size={18} className="text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-6 py-4 shadow-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Interview Scheduling Form */}
            {showInterviewForm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Schedule Interview</h3>
                    <button 
                      onClick={handleCloseInterviewForm}
                      className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {interviewError && (
                      <div className="bg-red-500/20 text-red-300 rounded-lg p-3 text-sm mb-4">
                        {interviewError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Candidate Name</label>
                      <input
                        type="text"
                        value={interviewDetails.candidateName}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, candidateName: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Enter candidate name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Position</label>
                      <input
                        type="text"
                        value={interviewDetails.position}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Enter position"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Interview Date & Time</label>
                      <input
                        type="datetime-local"
                        value={interviewDetails.interviewDate}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, interviewDate: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                      <textarea
                        value={interviewDetails.notes}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Add any additional notes"
                        rows={3}
                      />
                    </div>
                    
                    <button
                      onClick={() => handleScheduleInterview(interviewDetails)}
                      disabled={!interviewDetails.candidateName || !interviewDetails.position || !interviewDetails.interviewDate}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl py-3 font-medium transition-all duration-200"
                    >
                      Schedule Interview
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="py-4 px-6 bg-slate-900/80 border-t border-slate-700/50">
              <div className="flex items-end gap-3 max-w-full mx-auto">
                <div className="relative flex-1 flex items-center bg-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-blue-500 shadow-xl">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                    className="p-3 hover:bg-slate-700/50 rounded-full transition-all duration-200 group flex-shrink-0 focus:outline-none"
                >
                    <Paperclip size={20} className="text-slate-400 group-hover:text-blue-400" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />
                <textarea
                  ref={textareaRef}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onInput={adjustTextareaHeight}
                  rows={1}
                    placeholder="Your message to AgentX..."
                    className="flex-1 resize-none bg-transparent outline-none text-white placeholder-slate-400 py-3 pr-4 overflow-hidden max-h-[120px]"
                  ></textarea>
                </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim()}
                  className={`h-10 px-4 flex items-center justify-center rounded-xl transition-all duration-200 shadow-lg flex-shrink-0
                    ${currentInput.trim()
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                  <Send size={20} className="text-white" />
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

      {showCallLetter && callLetter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Interview Call Letter</h3>
              <button 
                onClick={() => setShowCallLetter(false)}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4 text-slate-300">
              <div className="whitespace-pre-wrap font-mono text-sm">
                {callLetter.letterContent}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    const blob = new Blob([callLetter.letterContent], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Interview_Call_Letter_${callLetter.candidateName.replace(/\s+/g, '_')}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                >
                  Download
                </button>
                <button
                  onClick={() => setShowCallLetter(false)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
