import { Route, Routes, Navigate } from "react-router-dom";
import ControlPage from "./pages/ControlPage";
import DisplayPage from "./pages/DisplayPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/control" replace />} />
      <Route path="/control" element={<ControlPage />} />
      <Route path="/display" element={<DisplayPage />} />
    </Routes>
  );
}

export default App;
