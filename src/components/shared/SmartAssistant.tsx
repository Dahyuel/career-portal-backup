import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const initialMessages: Message[] = [
    {
        id: '1',
        text: "Hi! 👋 I'm your ASU Career Fair assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
    },
];

// Predefined responses for common questions
const botResponses: Record<string, string> = {
    'hello': "Hello! 👋 Welcome to ASU Employment Fair 2026. How can I assist you?",
    'hi': "Hi there! 👋 I'm here to help you with any questions about the career fair.",
    'help': "I can help you with:\n• Event registration\n• Schedule information\n• Company listings\n• Venue directions\n• General FAQs\n\nWhat would you like to know?",
    'register': "To register for the event:\n1. Click on your login type (ASU or Non-ASU)\n2. Create an account or login\n3. Complete your profile\n4. You'll receive a confirmation email!\n\nNeed more help?",
    'schedule': "The event runs for 6 days:\n• Day 1: Opening Ceremony\n• Day 2: Technology & Engineering\n• Day 3: Business & Finance\n• Day 4: Healthcare & Sciences\n• Day 5: Creative Industries\n• Day 6: Closing & Networking\n\nLogin to see the full schedule!",
    'companies': "50+ top companies will be attending including multinationals, startups, and government organizations. Login to see the complete list!",
    'location': "The event takes place at Ain Shams University Campus. Detailed venue maps will be available after registration.",
    'date': "ASU Employment Fair 2026 will be held in April 2026. Stay tuned for specific dates!",
    'contact': "You can reach us at:\n📧 career@asu.edu.eg\n📞 +20 2 1234 5678",
    'default': "I'm not sure I understand. Could you rephrase that? Or try asking about:\n• Registration\n• Schedule\n• Companies\n• Location\n• Contact info",
};

const getResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    for (const [key, response] of Object.entries(botResponses)) {
        if (lowerInput.includes(key)) {
            return response;
        }
    }

    return botResponses['default'];
};

export const SmartAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { isDark } = useTheme();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate typing delay
        setTimeout(() => {
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: getResponse(inputValue),
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }, 800 + Math.random() * 700);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const toggleChat = () => {
        if (isMinimized) {
            setIsMinimized(false);
        } else if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div className="fixed bottom-24 md:bottom-4 right-4 z-50">
            {/* Chat Window */}
            {isOpen && !isMinimized && (
                <div className={`mb-4 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">ASU Assistant</h3>
                                <p className="text-xs text-red-100">Always here to help</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                                aria-label="Minimize"
                            >
                                <Minimize2 className="h-4 w-4 text-white" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className={`h-80 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isDark ? 'bg-gray-800' : 'bg-gray-50'
                        }`}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'bot'
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                    }`}>
                                    {message.sender === 'bot' ? (
                                        <Bot className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    ) : (
                                        <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    )}
                                </div>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${message.sender === 'bot'
                                    ? isDark ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-800 shadow-sm'
                                    : 'bg-red-500 text-white'
                                    }`}>
                                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                                    <Bot className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className={`p-3 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                className={`flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${isDark
                                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                                    : 'bg-gray-100 text-gray-800 placeholder-gray-500'
                                    }`}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTyping ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button - hidden when chat is open */}
            {!(isOpen && !isMinimized) && (
                <button
                    onClick={toggleChat}
                    className="group w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    aria-label="Open assistant"
                >
                    <Bot className="h-6 w-6 text-white" />
                    {/* Notification badge */}
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>
            )}
        </div>
    );
};
