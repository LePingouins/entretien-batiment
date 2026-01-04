import * as React from 'react';
import { useLang } from '../context/LangContext';

const TechDashboard: React.FC = () => {
  const { t } = useLang();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t.techDashboardTitle || 'Tech Dashboard'}</h1>
      <p>{t.techDashboardWelcome || 'Welcome to the technician dashboard. Work order features coming soon!'}</p>
    </div>
  );
};

export default TechDashboard;
