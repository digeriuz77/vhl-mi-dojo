import React, { useState } from 'react';

interface PersonaCreationFormProps {
  onCreatePersona: (scenarioType: string, changeReadiness: string) => void;
}

const PersonaCreationForm: React.FC<PersonaCreationFormProps> = ({ onCreatePersona }) => {
  const [scenarioType, setScenarioType] = useState('');
  const [changeReadiness, setChangeReadiness] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreatePersona(scenarioType, changeReadiness);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create a Persona</h2>
      <div>
        <label htmlFor="scenarioType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Scenario Type
        </label>
        <select
          id="scenarioType"
          value={scenarioType}
          onChange={(e) => setScenarioType(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        >
          <option value="">Select a scenario type</option>
          <option value="chronic_illness">Chronic Illness</option>
          <option value="addiction">Addiction</option>
          <option value="lifestyle_change">Lifestyle Change</option>
          <option value="mental_health">Mental Health</option>
          <option value="preventive_care">Preventive Care</option>
        </select>
      </div>
      <div>
        <label htmlFor="changeReadiness" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Readiness
        </label>
        <select
          id="changeReadiness"
          value={changeReadiness}
          onChange={(e) => setChangeReadiness(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        >
          <option value="">Select change readiness</option>
          <option value="pre-contemplation">Pre-contemplation</option>
          <option value="contemplation">Contemplation</option>
          <option value="preparation">Preparation</option>
          <option value="action">Action</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Create Persona
      </button>
    </form>
  );
};

export default PersonaCreationForm;