export interface Message {
  role: 'user' | 'assistant' | 'code';
  content: string;
}

export interface MIMetrics {
  reflectionToQuestionRatio: number;
  percentComplexReflections: number;
  percentOpenQuestions: number;
  miAdherentResponses: number;
  spiritOfMIAdherence: number;
  changeTalkIdentification: {
    preparatory: string[];
    mobilizing: string[];
  };
  overallAdherenceScore: number;
  reasoning: string;
}
