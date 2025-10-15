import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, Settings, Truck, CheckCircle2, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import type { Tables } from "@/integrations/supabase/types";

type Pedido = Tables<"pedidos">;

interface PedidoGroup {
  numero_pedido: string;
  pedidos: Pedido[];
  primeira_data: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  filter: (pedido: Pedido) => boolean;
}

const Kanban = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const columns: KanbanColumn[] = [
    {
      id: "novo_pedido",
      title: "Novo Pedido",
      icon: <FileText className="w-4 h-4" />,
      colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      filter: (p) => !p.insumos && !p.em_producao && !p.envio_expedicao && !p.despachado,
    },
    {
      id: "insumos",
      title: "Insumos",
      icon: <Package className="w-4 h-4" />,
      colorClass: "bg-warning/10 text-warning border-warning/20",
      filter: (p) => p.insumos && !p.em_producao && !p.despachado,
    },
    {
      id: "em_producao",
      title: "Em Produção",
      icon: <Settings className="w-4 h-4" />,
      colorClass: "bg-primary/10 text-primary border-primary/20",
      filter: (p) => p.em_producao && !p.envio_expedicao && !p.despachado,
    },
    {
      id: "envio_expedicao",
      title: "Expedição",
      icon: <Truck className="w-4 h-4" />,
      colorClass: "bg-accent/10 text-accent border-accent/20",
      filter: (p) => p.envio_expedicao && !p.despachado,
    },
    {
      id: "despachado",
      title: "Despachado",
      icon: <CheckCircle2 className="w-4 h-4" />,
      colorClass: "bg-success/10 text-success border-success/20",
      filter: (p) => p.despachado === true,
    },
  ];

  const groupPedidosByNumero = (pedidos: Pedido[]): PedidoGroup[] => {
    const grouped = new Map<string, Pedido[]>();
    
    pedidos.forEach(pedido => {
      const key = pedido.numero_pedido || `individual_${pedido.id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(pedido);
    });
    
    return Array.from(grouped.entries()).map(([numero, pedidos]) => ({
      numero_pedido: numero,
      pedidos,
      primeira_data: pedidos[0].dia_pedido || pedidos[0].created_at,
    }));
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Error fetching pedidos:", error);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar os pedidos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel("pedidos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
        },
        () => {
          fetchPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kanban de Produção</h1>
        <p className="text-muted-foreground">
          Acompanhe o status de todos os pedidos em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((column) => {
          const columnPedidos = pedidos.filter(column.filter);
          const groupedPedidos = groupPedidosByNumero(columnPedidos);

          return (
            <Card key={column.id} className="shadow-medium border-border/50">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${column.colorClass}`}>
                      {column.icon}
                    </div>
                    {column.title}
                  </div>
                  <Badge variant="secondary" className="transition-smooth">
                    {groupedPedidos.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-4 space-y-3">
                    {groupedPedidos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum pedido nesta etapa
                      </div>
                    ) : (
                      groupedPedidos.map((group) => (
                        <Card
                          key={group.numero_pedido}
                          className="p-4 hover:shadow-medium transition-smooth cursor-pointer border-border/50"
                        >
                          <div className="space-y-3">
                            {/* Header do Card */}
                            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/50">
                              <h4 className="font-bold text-base">
                                Pedido #{group.numero_pedido.startsWith('individual_') ? group.pedidos[0].id : group.numero_pedido}
                              </h4>
                              <div className="flex flex-col items-end gap-1">
                                {group.pedidos.length > 1 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {group.pedidos.length} itens
                                  </Badge>
                                )}
                                {group.primeira_data && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {typeof group.primeira_data === 'string' && group.primeira_data.includes('/') ? group.primeira_data : formatDate(group.primeira_data)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Lista de Itens do Pedido */}
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {group.pedidos.map((pedido, index) => (
                                <div 
                                  key={pedido.id} 
                                  className={`space-y-1 ${index > 0 ? 'pt-2 border-t border-border/30' : ''}`}
                                >
                                  {pedido.espelho && (
                                    <div className="text-sm font-semibold text-foreground">
                                      • {pedido.espelho}
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-2 ml-3">
                                    {pedido.tamanho && (
                                      <span className="text-xs text-muted-foreground">
                                        Tamanho: {pedido.tamanho}
                                      </span>
                                    )}
                                    
                                    {pedido.cor && (
                                      <Badge variant="secondary" className="text-xs">
                                        Cor: {pedido.cor}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
};

export default Kanban;
