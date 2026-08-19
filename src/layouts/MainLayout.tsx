import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* You can add a header/sidebar here later */}
      <Outlet />
    </div>
  );
}