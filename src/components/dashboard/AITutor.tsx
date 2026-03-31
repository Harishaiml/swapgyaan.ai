import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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

const AITutor = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: "Hi! I'm your AI tutor. Ask me about learning roadmaps, quiz questions, skill suggestions, or anything related to your learning journey! 🚀" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("explain");
  const [simplify, setSimplify] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: input };
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

  const modeButtons: { key: Mode; icon: typeof Code; label: string }[] = [
    { key: "explain", icon: BookOpen, label: "Explain" },
    { key: "code", icon: Code, label: "Code" },
    { key: "steps", icon: ListOrdered, label: "Steps" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">AI Tutor</h1>
        <p className="text-muted-foreground mb-3">Your personal learning assistant</p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {modeButtons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={simplify} onCheckedChange={setSimplify} />
            <span className="text-xs text-muted-foreground">Explain Simply</span>
          </div>
        </div>
      </motion.div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl p-4 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-card shadow-card border border-border/50"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
            </div>
            <div className="bg-card shadow-card border border-border/50 rounded-xl p-4 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {messages.length > 2 && (
          <Button variant="outline" size="sm" onClick={handleImprove} disabled={isLoading} className="self-start">
            <RefreshCw className="w-3.5 h-3.5" /> Improve Answer
          </Button>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about roadmaps, quizzes, skill suggestions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
            disabled={isLoading}
          />
          <Button variant="hero" onClick={handleSend} disabled={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
