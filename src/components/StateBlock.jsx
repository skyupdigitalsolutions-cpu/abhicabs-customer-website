import React from "react";

const iconBg = {
  info: "bg-primary-tint text-primary",
  error: "bg-error-tint text-error",
  empty: "bg-bg text-text-secondary"
};

export function Spinner() {
  return <div className="w-8.5 h-8.5 rounded-full border-[3px] border-primary-tint border-t-primary animate-spin mx-auto" />;
}

export default function StateBlock({ tone = "info", icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6 bg-white border border-border rounded-2xl">
      <div className={`w-16 h-16 rounded-full mx-auto mb-4.5 flex items-center justify-center ${iconBg[tone]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-2 text-text-secondary text-[14.5px] max-w-[380px] mx-auto">{description}</p>}
      {action && <div className="mt-4.5">{action}</div>}
    </div>
  );
}
