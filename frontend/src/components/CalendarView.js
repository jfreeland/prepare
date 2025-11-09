import React, { useState } from 'react';
import './CalendarView.css';

const CalendarView = ({ plan, formData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return '';
    return Number(distance).toFixed(1);
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date(); // Return current date as fallback
    // Handle both ISO strings and YYYY-MM-DD format
    if (dateString.includes('T')) {
      return new Date(dateString);
    } else {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  };
  
  // Create a map of dates to workouts for quick lookup
  const workoutMap = {};
  plan.forEach(week => {
    week.workouts.forEach(workout => {
      const dateKey = parseLocalDate(workout.date).toISOString().split('T')[0];
      workoutMap[dateKey] = workout;
    });
  });

  const getWorkoutColor = (type) => {
    const colors = {
      'Rest': '#e9ecef',
      'Easy Run': '#d4edda',
      'Long Run': '#cce5ff',
      'Speed Work': '#f8d7da',
      'Tempo Run': '#fff3cd',
      'Cross Training': '#e2e3e5',
      'Race Day': '#d1ecf1'
    };
    return colors[type] || '#ffffff';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isRaceDay = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const workout = workoutMap[dateKey];
    return workout && workout.type === 'Race Day';
  };

  const getWorkoutForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return workoutMap[dateKey];
  };

  const monthDays = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h3>Training Calendar</h3>
        <div className="calendar-navigation">
          <button 
            onClick={() => navigateMonth(-1)}
            className="nav-button"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="current-month">
            {formatMonthYear(currentDate)}
          </span>
          <button 
            onClick={() => navigateMonth(1)}
            className="nav-button"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#d4edda' }}></div>
          <span>Easy Run</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#cce5ff' }}></div>
          <span>Long Run</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f8d7da' }}></div>
          <span>Speed Work</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#fff3cd' }}></div>
          <span>Tempo Run</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#e9ecef' }}></div>
          <span>Rest</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#d1ecf1' }}></div>
          <span>Race Day</span>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>
        
        <div className="calendar-days">
          {monthDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="calendar-day empty"></div>;
            }

            const workout = getWorkoutForDate(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isTodayDate = isToday(date);
            const isRace = isRaceDay(date);

            return (
              <div 
                key={date.toISOString()} 
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isTodayDate ? 'today' : ''} ${isRace ? 'race-day' : ''}`}
                style={{ 
                  backgroundColor: workout ? getWorkoutColor(workout.type) : '#ffffff'
                }}
              >
                <div className="calendar-day-number">
                  {date.getDate()}
                  {isTodayDate && <span className="today-indicator">•</span>}
                </div>
                
                {workout && (
                  <div className="calendar-workout">
                    <div className="workout-type-small">{workout.type}</div>
                    {workout.distance && (
                      <div className="workout-distance-small">{formatDistance(workout.distance)} mi</div>
                    )}
                    {isRace && <div className="race-indicator">🏁</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-summary">
        <p>
          <strong>Training Period:</strong> {parseLocalDate(plan[0].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {parseLocalDate(formData.raceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p>
          <strong>Total Weeks:</strong> {plan.length} weeks
        </p>
      </div>
    </div>
  );
};

export default CalendarView;