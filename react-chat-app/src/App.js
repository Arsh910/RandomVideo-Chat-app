// routes
import Router from "./routes";
// theme
import ThemeProvider from './theme';
// components
import ThemeSettings from './components/settings';
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <ThemeProvider>
      <ThemeSettings>
        {" "}
        <ToastContainer autoClose={2000} />
        <Router />{" "}
      </ThemeSettings>
    </ThemeProvider>
  );
}

export default App;
