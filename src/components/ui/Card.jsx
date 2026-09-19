import React from "react";

// Updated to match the Figma bundler export's card styling exactly:
// border #EFEFEF (was the generic --color-border token, #E5E7EB), 20px
// radius (was 16px via rounded-2xl), and no shadow — the spec's cards are
// clean-bordered rather than shadowed. This is a shared component used
// across many pages, so this one change brings all of them in line at once.
export default function Card({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag className={`bg-white border border-[#EFEFEF] rounded-[20px] ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
