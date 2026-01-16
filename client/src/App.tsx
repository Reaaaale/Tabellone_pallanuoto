import { Route, Routes } from "react-router-dom";
import ControlPage from "./pages/ControlPage";
import DisplayPage from "./pages/DisplayPage";
import SetupPage from "./pages/SetupPage";
import StartPage from "./pages/StartPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/control" element={<ControlPage />} />
      <Route path="/display" element={<DisplayPage />} />
    </Routes>
  );
}

export default App;
