export interface Voo {
  id_voo: string;
  horario_pouso: string;
  horario_corte: string;
  horario_pushback: string;
  std: string;
  etd: string;
  pax_atendidos: number;
  
  // Check-IN and Embarque
  abertura_checkin: string;
  status_abertura_checkin: string;
  fechamento_checkin: string;
  status_fechamento_checkin: string;
  inicio_embarque: string;
  status_inicio_embarque: string;
  ultimo_pax: string;
  status_ultimo_pax: string;
  bags_atendidos: number;
  bags_atendidos_raw: string;
  meta_bags: number;
  status_bags: string;

  // AHL & OHD
  horario_abertura_ahl: string;
  status_abertura_ahl: string;
  ahl_entregue: string;
  status_entrega_ahl: string;
  data_lista_conteudo: string;
  
  horario_abertura_ohd: string;
  status_abertura_ohd: string;
  data_retorno_ohd: string;

  // Rampa
  abertura_porao: string;
  status_abertura_porao: string;
  descarga_bags: string;
  status_descarga_bags: string;
  descarga_cargas: string;
  status_descarga_cargas: string;
  carregamento_bags: string;
  status_carregamento_bags: string;
  carregamento_cargas: string;
  status_carregamento_cargas: string;
  primeira_bag_esteira: string;
  status_primeira_bag: string;
  ultima_bag_esteira: string;

  // Limpeza
  inicio_limpeza: string;
  termino_limpeza: string;
  status_limpeza: string;
  avaliacao_limpeza: string;

  // Safety
  dano_aeronave: string;
  peso_balanceamento: string;
  procedimento_calco: string;
  procedimento_cones: string;
  gse_sem_preventiva: string;
  carregamento_bag_safety: string;
  reabastecimento_pax: string;
  situacao_carregamento: string;
  situacao_notoc: string;
}
