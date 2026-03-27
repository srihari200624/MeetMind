import React from "react";

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`hsl(${hue},55%,55%)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:size*0.38, fontWeight:700, color:"#fff", fontFamily:"var(--font-display)" }}>{initials}</span>
    </div>
  );
}

export default Avatar;