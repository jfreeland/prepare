import React, { useState, useEffect } from 'react';
import './TrainingForm.css';

const TrainingForm = ({ onFormSubmit, initialFormData }) => {
  const [formData, setFormData] = useState(initialFormData || {
    raceType: '',
    skillLevel: '',
    raceDate: '',
    longRunDay: '',
    trainingDays: []
  });

  const [errors, setErrors] = useState({});

  // Update form data when initialFormData changes (for editing)
  useEffect(() => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
  }, [initialFormData]);

  const raceTypes = [
    { value: 'marathon', label: 'Marathon (26.2 miles)' },
    { value: 'half-marathon', label: 'Half Marathon (13.1 miles)' }
  ];

  const skillLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const weekDays = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTrainingDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.includes(day)
        ? prev.trainingDays.filter(d => d !== day)
        : [...prev.trainingDays, day]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.raceType) {
      newErrors.raceType = 'Please select a race type';
    }
    
    if (!formData.skillLevel) {
      newErrors.skillLevel = 'Please select your skill level';
    }
    
    if (!formData.raceDate) {
      newErrors.raceDate = 'Please select a race date';
    } else {
      const raceDate = new Date(formData.raceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (raceDate <= today) {
        newErrors.raceDate = 'Race date must be in the future';
      }
    }
    
    if (!formData.longRunDay) {
      newErrors.longRunDay = 'Please select your long run day';
    }
    
    if (formData.trainingDays.length === 0) {
      newErrors.trainingDays = 'Please select at least one training day';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      onFormSubmit(formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="training-form">
      <h2>Create Your Training Plan</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="raceType">Race Type</label>
          <select
            id="raceType"
            name="raceType"
            value={formData.raceType}
            onChange={handleInputChange}
            className={errors.raceType ? 'error' : ''}
          >
            <option value="">Select race type</option>
            {raceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.raceType && <span className="error-message">{errors.raceType}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="skillLevel">Running Level</label>
          <select
            id="skillLevel"
            name="skillLevel"
            value={formData.skillLevel}
            onChange={handleInputChange}
            className={errors.skillLevel ? 'error' : ''}
          >
            <option value="">Select your level</option>
            {skillLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          {errors.skillLevel && <span className="error-message">{errors.skillLevel}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="raceDate">Race Date</label>
          <input
            type="date"
            id="raceDate"
            name="raceDate"
            value={formData.raceDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className={errors.raceDate ? 'error' : ''}
          />
          {errors.raceDate && <span className="error-message">{errors.raceDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="longRunDay">Long Run Day</label>
          <select
            id="longRunDay"
            name="longRunDay"
            value={formData.longRunDay}
            onChange={handleInputChange}
            className={errors.longRunDay ? 'error' : ''}
          >
            <option value="">Select long run day</option>
            {weekDays.map(day => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          {errors.longRunDay && <span className="error-message">{errors.longRunDay}</span>}
        </div>

        <div className="form-group">
          <label>Training Days</label>
          <div className="training-days">
            {weekDays.map(day => (
              <label key={day.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.trainingDays.includes(day.value)}
                  onChange={() => handleTrainingDayToggle(day.value)}
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
          {errors.trainingDays && <span className="error-message">{errors.trainingDays}</span>}
        </div>

        <button type="submit" className="submit-button">
          Generate Training Plan
        </button>
      </form>
    </div>
  );
};

export default TrainingForm;