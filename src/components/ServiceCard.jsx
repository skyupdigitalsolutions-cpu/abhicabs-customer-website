import React from "react";
import Button from "./ui/Button";

export default function ServiceCard({ icon, title, description, mode, onBook }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-6.5 transition-all hover:-translate-y-1 hover:shadow-elevated">
      <div className="w-13 h-13 rounded-[14px] bg-primary-tint text-primary flex items-center justify-center mb-4.5">
        {icon}
      </div>
      <h3 className="text-[19px] font-bold">{title}</h3>
      <p className="mt-2 text-text-secondary text-[14.5px] min-h-[42px]">{description}</p>
      <Button variant="outline" size="sm" block onClick={() => onBook(mode)} className="mt-4">
        Book Now
      </Button>
    </div>
  );
}
