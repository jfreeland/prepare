import React, { useState } from 'react';
import TrainingForm from './components/TrainingForm';
import TrainingPlanDisplay from './components/TrainingPlanDisplay';
import './App.css';

function App() {
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [formData, setFormData] = useState(null);

  const handleFormSubmit = async (submittedFormData) => {
    try {
      // Use environment variable with fallback
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const apiUrl = `${apiBaseUrl}/api/generate-plan`;

      // Convert camelCase to snake_case for backend
      const backendFormData = {
        race_type: submittedFormData.raceType,
        skill_level: submittedFormData.skillLevel,
        race_date: submittedFormData.raceDate,
        long_run_day: submittedFormData.longRunDay,
        training_days: submittedFormData.trainingDays
      };

      console.log('API URL from env:', process.env.REACT_APP_API_URL);
      console.log('Using API URL:', apiUrl);
      console.log('Original form data:', submittedFormData);
      console.log('Backend form data:', backendFormData);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendFormData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        setTrainingPlan(result.plan);
        setFormData(submittedFormData);
      } else {
        alert('Error generating training plan: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating training plan:', error);
      alert('There was an error generating your training plan. Please check your inputs and try again.');
    }
  };

  const handleEditPlan = () => {
    setTrainingPlan(null);
    // Keep formData so it can be passed back to the form
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Marathon Training Plan Generator</h1>
        <p>Create a personalized training plan for your next race</p>
      </header>

      <main className="App-main">
        {!trainingPlan ? (
          <TrainingForm onFormSubmit={handleFormSubmit} initialFormData={formData} />
        ) : (
          <TrainingPlanDisplay
            plan={trainingPlan}
            formData={formData}
            onEdit={handleEditPlan}
          />
        )}
      </main>
    </div>
  );
}

export default App;
