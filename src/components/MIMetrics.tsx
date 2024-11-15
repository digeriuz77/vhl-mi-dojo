import React from "react";
import { MIMetrics } from "@/types";

interface MIMetricsProps {
  metrics: MIMetrics;
}

export function MIMetrics({ metrics }: MIMetricsProps) {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2">
      <h2 className="text-lg font-semibold mb-2">MI Metrics</h2>
      <div className="space-y-2">
        <div>
          <strong>Reflection to Question Ratio:</strong> {metrics.reflectionToQuestionRatio.toFixed(2)}
        </div>
        <div>
          <strong>Percent Complex Reflections:</strong> {metrics.percentComplexReflections.toFixed(2)}%
        </div>
        <div>
          <strong>Percent Open Questions:</strong> {metrics.percentOpenQuestions.toFixed(2)}%
        </div>
        <div>
          <strong>MI Adherent Responses:</strong> {metrics.miAdherentResponses}
        </div>
        <div>
          <strong>Spirit of MI Adherence:</strong> {metrics.spiritOfMIAdherence.toFixed(2)}%
        </div>
        <div>
          <strong>Overall Adherence Score:</strong> {metrics.overallAdherenceScore.toFixed(2)}%
        </div>
        <div>
          <strong>Change Talk Identification:</strong>
          <ul className="list-disc list-inside">
            <li>
              <strong>Preparatory:</strong> {metrics.changeTalkIdentification.preparatory.join(", ")}
            </li>
            <li>
              <strong>Mobilizing:</strong> {metrics.changeTalkIdentification.mobilizing.join(", ")}
            </li>
          </ul>
        </div>
        <div>
          <strong>Reasoning:</strong> {metrics.reasoning}
        </div>
      </div>
    </div>
  );
}
