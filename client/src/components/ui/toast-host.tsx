import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";

export function ToastHost() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <ToastContainer
      position={isDesktop ? "top-right" : "bottom-center"}
      autoClose={5000}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      draggable
      limit={3}
      theme="light"
      aria-live="polite"
      toastClassName="!rounded-md !font-sans !text-sm !text-heading !shadow-md"
    />
  );
}