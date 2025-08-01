// App.tsx - Updated with offline detection
import React from 'react';
import EmployeeApp from './employee-app/EmployeeApp';
import OfflineDetector from './employee-app/OfflineDetector';

function App() {
  return (
    <div className="App">
      <OfflineDetector>
        <EmployeeApp />
      </OfflineDetector>
    </div>
  );
}

export default App;
