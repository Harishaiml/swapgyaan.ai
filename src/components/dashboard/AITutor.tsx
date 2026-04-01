import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Send, Sparkles, Bot, User, RefreshCw, Code, ListOrdered, BookOpen } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

type Mode = "explain" | "code" | "steps";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const modeConfig: { key: Mode; icon: typeof Code; label: string; color: string }[] = [
  { key: "explain", icon: BookOpen, label: "Explain", color: "from-blue-500 to-blue-600" },
  { key: "code", icon: Code, label: "Code", color: "from-violet-500 to-violet-600" },
  { key: "steps", icon: ListOrdered, label: "Steps", color: "from-teal-500 to-teal-600" },
];

const suggestedPrompts = [
  "Create a learning roadmap for React",
  "Explain async/await in simple terms",
  "Quiz me on JavaScript basics",
  "What skills should I learn for web dev?",
];

const AITutor = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! I'm your AI tutor. Ask me about learning roadmaps, quiz questions, skill suggestions, or anything related to your learning journey! 🚀",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("explain");
  const [simplify, setSimplify] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("skills_wanted, skills_offered").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setUserSkills([...(data.skills_wanted || []), ...(data.skills_offered || [])]);
    });
  }, [user]);

  const streamChat = async (chatMessages: { role: string; content: string }[], skill?: string) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: chatMessages, skill, mode, simplify }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.id !== 1) {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: fullContent } : m);
              }
              return [...prev, { id: Date.now(), role: "assistant", content: fullContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const chatHistory = [...messages.filter(m => m.id !== 1), userMsg].map(m => ({ role: m.role, content: m.content }));
    const skill = userSkills.length > 0 ? userSkills.join(", ") : undefined;

    try {
      await streamChat(chatHistory, skill);
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprove = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.id !== 1);
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser || !lastAssistant) return;

    setIsLoading(true);
    const improveMessages = [
      { role: "user", content: lastUser.content },
      { role: "assistant", content: lastAssistant.content },
      { role: "user", content: "Please improve and expand your previous answer with more detail, examples, and better structure." },
    ];

    setMessages(prev => [...prev, { id: Date.now(), role: "user", content: "🔄 Improve last answer" }]);

    try {
      await streamChat(improveMessages, userSkills.join(", "));
    } catch (e: any) {
      toast.error(e.message || "Failed to improve answer");
    } finally {
      setIsLoading(false);
    }
  };

  const currentMode = modeConfig.find(m => m.key === mode)!;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold font-display text-foreground mb-1">AI Tutor</h1>
        <p className="text-muted-foreground text-sm">Your personal AI-powered learning assistant</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Mode selector */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {modeConfig.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                mode === key
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Simplify toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={simplify} onCheckedChange={setSimplify} />
          <span className="text-xs font-medium text-muted-foreground">Explain Simply</span>
        </label>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card flex flex-col overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Suggested prompts - only show at start */}
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 group"
                >
                  <Sparkles className="w-3 h-3 text-primary mb-1 group-hover:scale-110 transition-transform" />
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {msg.role === "assistant" && (
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentMode.color} flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm shadow-sm"
                  : "bg-muted/60 border border-border/50 text-foreground rounded-bl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentMode.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Bot className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 space-y-2">
          {messages.length > 2 && (
            <button
              onClick={handleImprove}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Improve last answer
            </button>
          )}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={`Ask about ${mode === "explain" ? "concepts" : mode === "code" ? "code" : "step-by-step guides"}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1 rounded-xl border-border focus-visible:ring-primary/30 text-sm"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm ${
                input.trim()
                  ? `bg-gradient-to-br ${currentMode.color} text-white hover:shadow-md`
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
