import { Route, Routes, Navigate } from "react-router-dom";
import ControlPage from "./pages/ControlPage";
import DisplayPage from "./pages/DisplayPage";
import SetupPage from "./pages/SetupPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/control" element={<ControlPage />} />
      <Route path="/display" element={<DisplayPage />} />
    </Routes>
  );
}

export default App;
