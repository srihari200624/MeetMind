import { getAvatarColor } from "./utils";

export default function Avatar({ name, size = 36 }) {
  const { bg, text } = getAvatarColor(name);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        color: text,
        fontSize: size * 0.38,
      }}
    >
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}
