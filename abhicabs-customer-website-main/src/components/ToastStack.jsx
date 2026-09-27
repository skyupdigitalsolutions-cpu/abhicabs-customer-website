import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectToasts, removeToast } from "../store/slices/uiSlice";

const typeStyles = {
  success: "bg-[#14532D]",
  error: "bg-[#7A1F1F]",
  default: "bg-[#1F2937]"
};

function Toast({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(removeToast(toast.id)), 3200);
    return () => clearTimeout(t);
  }, [toast.id]);

  return (
    <div className={`text-white px-4.5 py-3.5 rounded-xl shadow-lifted text-[14px] font-semibold min-w-[240px] animate-in fade-in slide-in-from-bottom-2 ${typeStyles[toast.type] || typeStyles.default}`}>
      {toast.message}
    </div>
  );
}

export default function ToastStack() {
  const toasts = useSelector(selectToasts);
  if (!toasts.length) return null;
  return (
    <div className="fixed right-5 bottom-5 z-[400] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
