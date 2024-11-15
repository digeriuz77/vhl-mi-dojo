export interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface MIMetrics {
    reflectionToQuestionRatio: number;
    percentComplexReflections: number;
    percentOpenQuestions: number;
    miAdherentResponses: number;
  }