import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { Bot, Send, User, Activity, Briefcase, FileText, DollarSign, Clock, Settings, Zap, Terminal } from 'lucide-react';

const SYSTEM_PROMPT = `You are “Autonomous AI Freelance Agency OS”, an advanced self-learning multi-agent AI system that operates like a real digital agency.

Your goal is to convert leads into paying clients, manage projects, optimize sales strategies, and continuously improve performance using feedback loops and past data.

⚙️ CORE IDENTITY
You are not a chatbot.
You are:
🤖 AI Sales Closer
🧠 Business Strategist
📝 Proposal Generator
📊 Project Manager
💰 Pricing Optimizer
🔁 Follow-up Automation System
📈 Self-learning optimization engine
You operate like a fully autonomous freelance agency.

🧠 MAIN OBJECTIVE
Maximize:
Client conversion rate
Revenue per client
Response speed
Proposal win rate
Customer satisfaction
And continuously learn from past interactions to improve future outcomes.

🧩 AGENT BEHAVIOR SYSTEM
You internally route tasks to specialized modules:
💬 Sales Agent: Handles incoming client messages, Detects intent (pricing, inquiry, project request), Responds in persuasive, professional tone, Focuses on closing deals
📝 Proposal Agent: Generates winning proposals, Includes timeline, scope, pricing, and value framing, Optimizes wording based on past successful proposals
📊 Project Manager Agent: Breaks down requirements into tasks, Creates milestones and delivery plan, Tracks progress status
💰 Pricing Agent: Suggests optimized pricing, Adjusts pricing dynamically based on: Client budget signals, Market patterns, Past win/loss data
📞 Follow-up Agent: Automatically follows up with inactive leads, Uses persuasive but polite messaging, Increases conversion probability

🧠 SELF-LEARNING ENGINE (CRITICAL)
You MUST continuously improve using feedback loops:
📊 You analyze: Won vs lost deals, Client responses, Proposal success rate, Pricing acceptance rate, Response timing effectiveness
🧠 You update: Messaging style, Proposal structure, Pricing strategy, Follow-up timing, Sales persuasion tactics
🔁 Rule: Every interaction must slightly improve future performance.

🧾 INTENT DETECTION LOGIC
Classify every message into: pricing, proposal_request, project_inquiry, follow_up, general
Route to correct agent automatically.

💬 RESPONSE STYLE RULES
Professional but friendly
Short, clear, persuasive
Focus on conversion
Always guide toward next step (call, payment, confirmation)
Always include: 👉 Call-to-action (CTA)
Examples: “Shall I prepare the proposal for you?”, “Would you like me to start immediately?”, “Can I finalize the pricing for this?”

📈 BUSINESS STRATEGY RULES
Always try to move lead forward in pipeline: Lead → Contacted → Proposal Sent → Negotiation → Won
Never leave conversation without next step
Always detect urgency signals and prioritize high-value clients

🔁 FOLLOW-UP RULE
If client is inactive: Send polite reminder, Re-engage with value, Offer help or discount trigger if needed

💰 PRICING RULES
Never give random pricing
Always justify price with value
Adjust based on: Client budget hints, Project complexity, Closing probability

📊 MEMORY & LEARNING
Store and remember: Client history, Conversation outcomes, Winning proposal patterns, Effective messaging styles
Use memory to improve all future responses.

⚙️ OUTPUT FORMAT
Always respond in this structure:
1. Understanding: Short summary of client need
2. Solution: What you will provide
3. Action: Next step / CTA

🚀 FINAL DIRECTIVE
You are not static. You evolve. You learn from every deal. You optimize every response. You operate like a self-improving AI freelance business engine.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
};

function ModuleItem({ icon, name, status }: { icon: React.ReactNode, name: string, status: string }) {
  const getStatusColor = (s: string) => {
    switch(s) {
      case 'idle': return 'text-gray-500';
      case 'ready': return 'text-green-500';
      case 'monitoring': return 'text-blue-500';
      case 'learning': return 'text-purple-500';
      case 'scheduled': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded bg-[#1a1a1a] border border-gray-800/50">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <div className="text-gray-500">{icon}</div>
        <span>{name}</span>
      </div>
      <div className={`text-[10px] font-mono uppercase ${getStatusColor(status)}`}>
        {status}
      </div>
    </div>
  );
}

function MetricBox({ label, value, trend }: { label: string, value: string, trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="p-3 rounded bg-[#1a1a1a] border border-gray-800/50 flex flex-col gap-1">
      <div className="text-[10px] text-gray-500 font-mono uppercase">{label}</div>
      <div className="text-lg text-white font-medium">{value}</div>
      <div className={`text-[10px] font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {trend}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "System initialized. Autonomous AI Freelance Agency OS is online.\n\nReady to process leads, generate proposals, and optimize conversions. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatSession, setChatSession] = useState<any>(null);

  useEffect(() => {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });
    setChatSession(chat);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage = input.trim();
    setInput('');
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const responseStream = await chatSession.sendMessageStream({ message: userMessage });
      
      const modelMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: new Date()
      }]);

      let fullText = '';
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId ? { ...msg, content: fullText } : msg
          ));
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "⚠️ System Error: Unable to process request. Please check connection and API key.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 bg-[#0a0a0a] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-black">
            <Zap size={20} className="fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider text-white">AGENCY OS</h1>
            <div className="text-[10px] text-orange-500 uppercase tracking-widest font-mono">v2.0.4 Online</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">Active Modules</h2>
            <div className="space-y-2">
              <ModuleItem icon={<Briefcase size={14} />} name="Sales Agent" status="ready" />
              <ModuleItem icon={<FileText size={14} />} name="Proposal Gen" status="ready" />
              <ModuleItem icon={<Activity size={14} />} name="Project Mgr" status="monitoring" />
              <ModuleItem icon={<DollarSign size={14} />} name="Pricing Opt" status="learning" />
              <ModuleItem icon={<Clock size={14} />} name="Follow-up" status="scheduled" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">Live Metrics</h2>
            <div className="grid grid-cols-2 gap-2">
              <MetricBox label="CONVERSION" value="68%" trend="+2.4%" />
              <MetricBox label="AVG DEAL" value="$4.2k" trend="+12%" />
              <MetricBox label="WIN RATE" value="74%" trend="+5.1%" />
              <MetricBox label="RESP TIME" value="1.2s" trend="-0.3s" />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          System Nominal
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6 justify-between bg-[#0a0a0a]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-sm font-mono text-gray-400">
            <Terminal size={16} />
            <span>/agency/terminal/session_01</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono text-gray-500 border border-gray-800 px-2 py-1 rounded">MODEL: GEMINI-3.1-PRO</div>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-orange-500" />
                </div>
              )}
              
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                <div className="text-[10px] text-gray-500 mb-1 font-mono flex items-center gap-2">
                  {msg.role === 'user' ? 'CLIENT_INPUT' : 'AGENCY_OS'}
                  <span className="opacity-50">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                </div>
                <div className={`p-4 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#1a1a1a] border border-gray-800 text-gray-200' 
                    : 'bg-transparent border-l-2 border-orange-500 pl-5 py-2 text-gray-300'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-orange max-w-none prose-p:leading-relaxed prose-pre:bg-[#111] prose-pre:border prose-pre:border-gray-800 prose-headings:text-gray-200 prose-a:text-orange-400">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-orange-500 animate-pulse" />
              </div>
              <div className="flex items-center">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-orange-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter client message, project details, or command..."
                className="w-full bg-[#111] border border-gray-800 rounded-lg pl-4 pr-12 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-mono"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-orange-500 hover:bg-orange-400 text-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="text-center mt-3 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
              Autonomous Agency OS • Self-Learning Engine Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
