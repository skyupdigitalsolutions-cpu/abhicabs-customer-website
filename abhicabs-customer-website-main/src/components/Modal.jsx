import React from "react";
import Button from "./ui/Button";

export default function Modal({ open, title, description, confirmLabel, onConfirm, onClose, danger }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 max-w-[420px] w-full shadow-lifted" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2.5 text-text-secondary text-[14.5px]">{description}</p>
        <div className="flex gap-2.5 mt-5.5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
