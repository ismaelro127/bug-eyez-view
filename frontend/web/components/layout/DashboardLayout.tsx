import React from 'react';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
    {children}
  </div>
);

export default DashboardLayout;
