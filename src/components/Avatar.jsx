/* Initials avatar, colored per-user. */
export default function Avatar({ user, size = 22 }) {
  if (!user) return null;
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        color: "#fdf8ec",
        background: user.color,
        flexShrink: 0,
      }}
    >
      {user.initials}
    </span>
  );
}
