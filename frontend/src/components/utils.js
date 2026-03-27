const avatarColors = ["#e0e7ff","#fce7f3","#d1fae5","#fef3c7","#e0f2fe","#f3e8ff"];
const avatarTextColors = ["#4338ca","#be185d","#065f46","#92400e","#0369a1","#7c3aed"];

export function getAvatarColor(name) {
  const i = (name?.charCodeAt(0) || 0) % avatarColors.length;
  return { bg: avatarColors[i], text: avatarTextColors[i] };
}
