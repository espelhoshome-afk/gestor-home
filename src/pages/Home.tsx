import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

// Generate a unique session ID for this chat session
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { 
          message: input,
          sessionId: sessionId 
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Desculpe, não consegui processar sua mensagem.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível se comunicar com a IA. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="w-full">
        <Card className="shadow-medium border-border/50">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-card to-secondary/20 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-accent shadow-soft">
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Assistente IA de Produção</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  Faça perguntas sobre seus pedidos e processos
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea ref={scrollRef} className="h-[calc(100dvh-280px)] md:h-[500px] p-3 md:p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Bot className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Bem-vindo ao Chat IA!</p>
                  <p className="text-sm">
                    Envie uma mensagem para começar a conversar
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 md:gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-3 transition-smooth break-words ${
                          message.role === "user"
                            ? "gradient-primary text-primary-foreground shadow-soft"
                            : "bg-secondary text-secondary-foreground shadow-soft"
                        }`}
                      >
                        <p className="text-xs md:text-sm whitespace-pre-wrap break-all">{message.content}</p>
                        <p className="text-[10px] md:text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 md:gap-3 justify-start">
                      <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                      <div className="bg-secondary text-secondary-foreground rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-soft">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border/50 p-3 md:p-4 bg-gradient-to-r from-card to-secondary/10">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1 transition-smooth text-sm md:text-base"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="gradient-accent hover:opacity-90 transition-smooth shadow-soft h-9 w-9 md:h-10 md:w-10 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;
