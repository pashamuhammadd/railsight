/**
 * Generic "default profile photo" glyph (head + shoulders silhouette),
 * used wherever the topbar shows a stand-in avatar for the current user
 * instead of a real profile photo. Colored white so it sits on the same
 * violet -> teal RailSight gradient background used for every other
 * avatar circle in the app.
 */
export default function ProfileIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
      <circle cx="12" cy="24.5" r="9.5" fill="#FFFFFF" />
    </svg>
  );
}
