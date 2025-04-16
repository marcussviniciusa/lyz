import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TimelineEvent = {
  age: number;
  event: string;
  type: 'health' | 'life' | 'other';
  description: string;
};

interface TimelineAnimationProps {
  events: TimelineEvent[];
  patientAge?: number;
  onEventClick?: (event: TimelineEvent, index: number) => void;
}

const TimelineAnimation: React.FC<TimelineAnimationProps> = ({ 
  events,
  patientAge = 100, // Idade máxima default para escala
  onEventClick 
}) => {
  const [visibleEvents, setVisibleEvents] = useState<TimelineEvent[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Detectar quando novos eventos são adicionados para animar
  useEffect(() => {
    if (events.length > visibleEvents.length) {
      // Novo evento adicionado - vamos animá-lo entrando
      const newEvent = events[events.length - 1];
      
      // Adicionar um pequeno atraso antes de mostrar o novo evento
      setTimeout(() => {
        setVisibleEvents(prev => [...prev, newEvent]);
      }, 300);
    } else {
      // Em outros casos (inicialização ou remoção de eventos), simplesmente atualize
      setVisibleEvents(events);
    }
  }, [events]);
  
  // Determinar a cor do evento com base no tipo
  const getEventColor = (type: string) => {
    switch (type) {
      case 'health':
        return 'bg-blue-500 border-blue-600';
      case 'life':
        return 'bg-green-500 border-green-600';
      case 'other':
        return 'bg-purple-500 border-purple-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };
  
  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'health':
        return 'Saúde';
      case 'life':
        return 'Vida';
      case 'other':
        return 'Outro';
      default:
        return type;
    }
  };
  
  // Calcular a posição do evento na linha do tempo
  const calculatePosition = (age: number) => {
    // Garantir que a idade está dentro dos limites
    const normalizedAge = Math.max(0, Math.min(age, patientAge));
    // Calcular a porcentagem da linha do tempo
    return (normalizedAge / patientAge) * 100;
  };
  
  // Ordenar eventos por idade
  const sortedEvents = [...visibleEvents].sort((a, b) => a.age - b.age);
  
  // Dividir eventos em categorias para exibir em camadas diferentes
  const healthEvents = sortedEvents.filter(evt => evt.type === 'health');
  const lifeEvents = sortedEvents.filter(evt => evt.type === 'life');
  const otherEvents = sortedEvents.filter(evt => evt.type === 'other');

  // Calcular década para agrupar eventos
  const getDecade = (age: number) => Math.floor(age / 10) * 10;
  
  // Agrupar eventos por década para exibição
  const eventsByDecade: Record<number, TimelineEvent[]> = {};
  sortedEvents.forEach((evt) => {
    const decade = getDecade(evt.age);
    if (!eventsByDecade[decade]) {
      eventsByDecade[decade] = [];
    }
    eventsByDecade[decade].push(evt);
  });
  
  // Décadas para exibir (baseado nos eventos ou um padrão se não houver eventos)
  const decades = Object.keys(eventsByDecade).length > 0 
    ? Object.keys(eventsByDecade).map(d => parseInt(d)) 
    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  
  return (
    <div className="timeline-animation w-full py-6 px-2">
      {/* Título e informações */}
      <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <h3 className="text-md font-medium text-gray-800">Linha do Tempo do Paciente</h3>
        <p className="text-xs text-gray-600 mt-1">Visualização cronológica de eventos importantes na vida do paciente. Use o mouse para interagir com os eventos.</p>
      </div>
      
      {/* Container da timeline com scroll horizontal */}
      <div className="overflow-x-auto pb-4">
        <div ref={timelineRef} className="relative min-w-full" style={{ minWidth: '800px', height: '250px' }}>
          {/* Fundo em camadas para as categorias */}
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 bg-blue-50/30 border-b border-blue-100"></div>
            <div className="flex-1 bg-green-50/30 border-b border-green-100"></div>
            <div className="flex-1 bg-purple-50/30"></div>
          </div>
          
          {/* Linha base da timeline */}
          <div className="absolute left-0 right-0 h-1 bg-gray-300" style={{ top: '50%' }}></div>
          
          {/* Marcadores de década */}
          {decades.map(decade => {
            const position = calculatePosition(decade);
            return (
              <div 
                key={decade}
                className="absolute top-0 bottom-0"
                style={{ left: `${position}%` }}
              >
                <div className="absolute h-full w-px bg-gray-200 z-0"></div>
                <div className="absolute top-full mt-1 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                  {decade}s
                </div>
              </div>
            );
          })}
          
          {/* Rótulos das categorias */}
          <div className="absolute left-2 top-1/6 text-xs font-medium text-blue-700">Saúde</div>
          <div className="absolute left-2 top-1/2 text-xs font-medium text-green-700">Vida</div>
          <div className="absolute left-2 top-5/6 text-xs font-medium text-purple-700">Outros</div>
          
          {/* Eventos da timeline por categoria */}
          <AnimatePresence>
            {/* Eventos de Saúde */}
            {healthEvents.map((evt, index) => renderEvent(evt, index, '25%'))}
            
            {/* Eventos de Vida */}
            {lifeEvents.map((evt, index) => renderEvent(evt, index, '50%'))}
            
            {/* Outros Eventos */}
            {otherEvents.map((evt, index) => renderEvent(evt, index, '75%'))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Legenda e estatísticas */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm font-medium">Saúde</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">Eventos relacionados à saúde: diagnósticos, tratamentos, cirurgias, etc.</div>
          <div className="mt-1 font-medium text-blue-700">{healthEvents.length} eventos</div>
        </div>
        
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm font-medium">Vida</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">Eventos importantes da vida: casamento, filhos, carreira, educação, etc.</div>
          <div className="mt-1 font-medium text-green-700">{lifeEvents.length} eventos</div>
        </div>
        
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-sm font-medium">Outros</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">Outros eventos relevantes: mudanças de estilo de vida, exposições ambientais, etc.</div>
          <div className="mt-1 font-medium text-purple-700">{otherEvents.length} eventos</div>
        </div>
      </div>
    </div>
  );
  
  // Função auxiliar para renderizar um evento na timeline
  function renderEvent(evt: TimelineEvent, index: number, verticalPosition: string) {
    const isHighlighted = highlightedIndex === sortedEvents.indexOf(evt);
    return (
      <motion.div
        key={`${evt.age}-${evt.event}-${index}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className={`absolute cursor-pointer ${isHighlighted ? 'z-20' : 'z-10'}`}
        style={{ 
          left: `${calculatePosition(evt.age)}%`, 
          top: verticalPosition,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={() => onEventClick && onEventClick(evt, sortedEvents.indexOf(evt))}
        onMouseEnter={() => setHighlightedIndex(sortedEvents.indexOf(evt))}
        onMouseLeave={() => setHighlightedIndex(null)}
      >
        {/* Marcador do evento */}
        <motion.div 
          className={`w-8 h-8 rounded-full ${getEventColor(evt.type)} border-2 flex items-center justify-center text-white font-bold text-xs`}
          whileHover={{ scale: 1.2 }}
          animate={isHighlighted ? { boxShadow: '0 0 0 4px rgba(255,255,255,0.8)' } : {}}>
          {evt.age}
        </motion.div>
        
        {/* Conectores */}
        <div className="absolute top-1/2 left-1/2 w-px h-16 bg-gray-300 -z-10" style={{ transform: 'translate(-50%, -50%)' }}></div>
        
        {/* Card de informação que aparece ao passar o mouse */}
        <AnimatePresence>
          {isHighlighted && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-12 -left-24 w-64 bg-white rounded-md shadow-lg p-3 text-left border border-gray-200 z-30"
            >
              <div className={`text-sm font-medium ${evt.type === 'health' ? 'text-blue-800' : evt.type === 'life' ? 'text-green-800' : 'text-purple-800'} mb-1 flex justify-between items-center`}>
                <span>{evt.event}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{evt.age} anos</span>
              </div>
              <div className="flex items-center mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                  ${evt.type === 'health' ? 'bg-blue-100 text-blue-800' : 
                  evt.type === 'life' ? 'bg-green-100 text-green-800' : 
                  'bg-purple-100 text-purple-800'}`}
                >
                  {getEventTypeLabel(evt.type)}
                </span>
              </div>
              {evt.description && (
                <p className="text-sm text-gray-600 mt-1">{evt.description}</p>
              )}
              <div className="absolute w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45 -top-1.5 left-24"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
};

export default TimelineAnimation;
