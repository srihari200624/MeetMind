import React from "react";

function ConfBar({ value }) {
  const color = value >= 70 ? "var(--green)" : value >= 40 ? "var(--amber)" : "var(--red)";
  return (
    <div className="conf-bar">
      <div className="conf-bar-fill" style={{ width:`${value}%`, background:color }} />
    </div>
  );
}

export default ConfBar;