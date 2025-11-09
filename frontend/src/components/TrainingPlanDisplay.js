import React, { useState } from 'react';
import CalendarView from './CalendarView';
import './TrainingPlanDisplay.css';

/* global google */

const TrainingPlanDisplay = ({ plan, formData, onEdit }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return '';
    return Number(distance).toFixed(1);
  };

  const parseLocalDate = (dateString) => {
    console.log('Parsing date:', dateString);
    if (!dateString) {
      console.log('Date string is null, returning current date');
      return new Date(); // Return current date as fallback
    }
    // Handle both ISO strings and YYYY-MM-DD format
    if (dateString.includes('T')) {
      return new Date(dateString);
    } else {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  };

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

  const formatDate = (date) => {
    if (!date) return 'Invalid date';
    try {
      const formatted = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return formatted;
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', date);
      return 'Invalid date';
    }
  };

  const getTotalWeeklyDistance = (week) => {
    return week.workouts
      .filter(w => w.type !== 'Rest' && w.type !== 'Cross Training')
      .reduce((total, workout) => total + (workout.distance || 0), 0);
  };

  const getTotalPlanDistance = () => {
    return plan.reduce((total, week) => total + getTotalWeeklyDistance(week), 0);
  };





  const generateICSContent = () => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marathon Training Plan//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

    plan.forEach(week => {
      week.workouts.forEach(workout => {
        if (workout.type !== 'Rest') {
          const eventDate = parseLocalDate(workout.date);
          const startDate = new Date(eventDate);
          startDate.setHours(9, 0, 0, 0); // Default to 9 AM

          const endDate = new Date(startDate);
          endDate.setHours(10, 0, 0, 0); // 1 hour duration

          const formatICSDate = (date) => {
            // Format as YYYYMMDDTHHMMSS (local time, no Z suffix)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
          };

          icsContent += `BEGIN:VEVENT
UID:marathon-training-${formData.raceType}-${formData.skillLevel}-${workout.date}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${workout.type}${workout.distance ? ` - ${workout.distance} miles` : ''}
DESCRIPTION:${workout.description}
LOCATION:Your preferred running location
CATEGORIES:Marathon Training
END:VEVENT
`;
        }
      });
    });

    icsContent += 'END:VCALENDAR';
    return icsContent;
  };

  const downloadICS = () => {
    const icsContent = generateICSContent();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marathon-training-plan-${formData.raceType}-${formData.skillLevel}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };



  const addToGoogleCalendar = async () => {
    try {
      // Initialize Google Identity Services
      if (!window.google || !window.google.accounts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Initialize fresh token client for add operation
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            // Load Calendar API
            if (!window.gapi) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                  window.gapi.load('client', () => {
                    window.gapi.client.init({
                      apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
                      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                    }).then(() => {
                      window.gapi.client.setToken(tokenResponse);
                      addEventsToCalendar();
                    }).catch(reject);
                  });
                };
                script.onerror = reject;
                document.body.appendChild(script);
              });
            } else {
              window.gapi.client.setToken(tokenResponse);
              await addEventsToCalendar();
            }
          } else {
            throw new Error('Failed to get access token');
          }
        },
      });

      // Request access token
      tokenClient.requestAccessToken();

    } catch (error) {
      if (error && error.message && (error.message.includes('API_KEY') || error.message.includes('CLIENT_ID'))) {
        alert('Google Calendar integration requires API setup. Please configure API credentials in the code.');
      } else {
        alert('Failed to add events to Google Calendar. Please try again.');
      }
      console.error('Google Calendar error:', error);
    }
  };

  const addEventsToCalendar = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const week of plan) {
      for (const workout of week.workouts) {
        if (workout.type === 'Rest') continue;

        const eventDate = parseLocalDate(workout.date);
        const eventDateString = eventDate.toISOString().split('T')[0];
        const nextDay = new Date(eventDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayString = nextDay.toISOString().split('T')[0];

        const event = {
          summary: `${workout.type}${workout.distance ? ` - ${workout.distance} miles` : ''}`,
          description: workout.description,
          location: 'Your preferred running location',
          start: {
            date: eventDateString
          },
          end: {
            date: nextDayString
          },
          extendedProperties: {
            private: {
              source: 'marathon-training-plan',
              raceType: formData.raceType,
              skillLevel: formData.skillLevel,
              workoutDate: workout.date
            }
          }
        };

        try {
          await window.gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
          });
          successCount++;
        } catch (error) {
          console.error('Failed to add event:', error);
          failCount++;
        }
      }
    }

    alert(`Successfully added ${successCount} events to Google Calendar${failCount > 0 ? ` (${failCount} failed)` : ''}`);
  };

  const removeFromGoogleCalendar = async () => {
    try {
      // Initialize Google Identity Services
      if (!window.google || !window.google.accounts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Initialize fresh token client for remove operation
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            // Load Calendar API
            if (!window.gapi) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                  window.gapi.load('client', () => {
                    window.gapi.client.init({
                      apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
                      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                    }).then(() => {
                      window.gapi.client.setToken(tokenResponse);
                      removeEventsFromCalendar();
                    }).catch(console.error);
                  });
                };
                script.onerror = console.error;
                document.body.appendChild(script);
              });
            } else {
              window.gapi.client.setToken(tokenResponse);
              await removeEventsFromCalendar();
            }
          } else {
            throw new Error('Failed to get access token');
          }
        },
      });

      // Request access token
      tokenClient.requestAccessToken();

    } catch (error) {
      if (error && error.message && (error.message.includes('API_KEY') || error.message.includes('CLIENT_ID'))) {
        alert('Google Calendar integration requires API setup. Please configure API credentials in the code.');
      } else {
        alert('Failed to remove events from Google Calendar. Please try again.');
      }
      console.error('Google Calendar error:', error);
    }
  };

  const removeEventsFromCalendar = async () => {
    try {
      // Get events from the last 6 months to next 6 months
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 6);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6);

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        privateExtendedProperty: 'source=marathon-training-plan'
      });

      const events = response.result.items;
      if (events.length === 0) {
        alert('No marathon training events found in your calendar.');
        return;
      }

      let deleteCount = 0;
      for (const event of events) {
        try {
          await window.gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: event.id
          });
          deleteCount++;
        } catch (error) {
          console.error('Failed to delete event:', error);
        }
      }

      alert(`Successfully removed ${deleteCount} marathon training events from Google Calendar.`);
    } catch (error) {
      console.error('Error removing events:', error);
      alert('Failed to remove events from Google Calendar. Please try again.');
    }
  };

  return (
    <div className="training-plan-display">
      <div className="plan-header">
        <h2>Your Training Plan</h2>
        <div className="plan-summary">
          <p><strong>Race:</strong> {formData.raceType === 'marathon' ? 'Marathon' : 'Half Marathon'}</p>
          <p><strong>Level:</strong> {formData.skillLevel.charAt(0).toUpperCase() + formData.skillLevel.slice(1)}</p>
          <p><strong>Race Date:</strong> {parseLocalDate(formData.raceDate).toLocaleDateString()}</p>
          <p><strong>Training Duration:</strong> {plan.length} weeks</p>
          <p><strong>Total Mileage:</strong> {getTotalPlanDistance().toFixed(1)} miles</p>
        </div>
         <div className="plan-actions">
           <div className="view-toggle">
             <button
               className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
               onClick={() => setViewMode('list')}
             >
               List View
             </button>
             <button
               className={`toggle-button ${viewMode === 'calendar' ? 'active' : ''}`}
               onClick={() => setViewMode('calendar')}
             >
               Calendar View
             </button>
           </div>
           <div className="action-buttons">
             <button onClick={downloadICS} className="download-button">
               📅 Download ICS
             </button>
             <button onClick={addToGoogleCalendar} className="google-add-button">
               ➕ Add to Google Calendar
             </button>
             <button onClick={removeFromGoogleCalendar} className="google-remove-button">
               ➖ Remove from Google Calendar
             </button>
             <button onClick={onEdit} className="edit-button">
               ✏️ Edit Plan Settings
             </button>
           </div>
         </div>
      </div>

      <div className="plan-content">
        {viewMode === 'calendar' ? (
          <CalendarView plan={plan} formData={formData} />
        ) : (
          <>
            {plan.map((week) => (
              <div key={week.week} className="week-container">
                <div className="week-header">
                  <h3>Week {week.week}</h3>
                  <span className="week-dates">
                    {formatDate(parseLocalDate(week.startDate))} - {formatDate(parseLocalDate(week.workouts[week.workouts.length - 1]?.date))}
                  </span>
                  <span className="weekly-total">
                    Total: {getTotalWeeklyDistance(week).toFixed(1)} miles
                  </span>
                </div>

                <div className="workouts-grid">
                  {week.workouts.map((workout) => (
                    <div
                      key={`${workout.date}-${workout.day}`}
                      className="workout-card"
                      style={{ backgroundColor: getWorkoutColor(workout.type) }}
                    >
                      <div className="workout-header">
                        <span className="workout-day">{workout.day.charAt(0).toUpperCase() + workout.day.slice(1)}</span>
                        <span className="workout-date">{formatDate(parseLocalDate(workout.date))}</span>
                      </div>
                      <div className="workout-type">{workout.type}</div>
                      {workout.distance && (
                        <div className="workout-distance">{formatDistance(workout.distance)} miles</div>
                      )}
                      <div className="workout-description">{workout.description}</div>
                      <div className="workout-intensity">Intensity: {workout.intensity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TrainingPlanDisplay;
