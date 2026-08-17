import L from 'leaflet';
import { MapPin } from '@/types/database';

const iconCache = new Map<string, L.DivIcon>();

/**
 * Generates clean initials from a full name for avatar fallback
 */
function getInitials(name?: string | null): string {
  if (!name) return 'NP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Escapes HTML entities for safe inclusion in Leaflet HTML markers
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates custom styled Leaflet DivIcon for social memory markers
 */
export function createSocialPinIcon(pin: MapPin, isSelected = false): L.DivIcon {
  const isSocial = pin.is_following || pin.is_follower || pin.is_own;
  const key = `${pin.id}-${isSelected}-${pin.has_audio}-${pin.author_avatar_url || ''}-${pin.author_name || ''}-${pin.category_name}-${isSocial}`;

  if (iconCache.has(key)) {
    return iconCache.get(key)!;
  }

  const categoryColor = '#0B6B3A'; // Brand green
  const authorName = escapeHtml(pin.author_name || 'Contributor');
  const initials = getInitials(pin.author_name);
  const avatarUrl = pin.author_avatar_url ? escapeHtml(pin.author_avatar_url) : null;
  const audioBadge = pin.has_audio
    ? `<span style="position:absolute;bottom:-2px;right:-2px;background:#D97706;color:white;border-radius:50%;width:14px;height:14px;font-size:8px;display:flex;align-items:center;justify-content:center;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.2);">🔊</span>`
    : '';

  const selectionRing = isSelected ? 'box-shadow: 0 0 0 3px #0B6B3A, 0 8px 16px rgba(11,107,58,0.4); transform: scale(1.1);' : 'box-shadow: 0 4px 12px rgba(0,0,0,0.25);';

  let html = '';

  if (isSocial && pin.author_name) {
    // Social Follower / Personal Marker with Avatar and Name Pill
    const avatarContent = avatarUrl
      ? `<img src="${avatarUrl}" alt="${authorName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <div style="display:none;width:100%;height:100%;border-radius:50%;background:#0B6B3A;color:white;font-weight:700;font-size:10px;align-items:center;justify-content:center;">${initials}</div>`
      : `<div style="width:100%;height:100%;border-radius:50%;background:#0B6B3A;color:white;font-weight:700;font-size:10px;display:flex;align-items:center;justify-content:center;">${initials}</div>`;

    const connectionBadge = pin.is_own
      ? `<span style="background:#0B6B3A;color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:4px;">You</span>`
      : pin.is_following
      ? `<span style="background:#E8F5EE;color:#0B6B3A;font-size:9px;font-weight:700;padding:1px 4px;border-radius:4px;border:1px solid #A3D9BC;">Following</span>`
      : `<span style="background:#F3F4F6;color:#374151;font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px;">Follower</span>`;

    html = `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${selectionRing};transition:transform 0.15s ease-in-out;position:relative;">
        <!-- Top Name Pill -->
        <div style="background:rgba(255,255,255,0.96);backdrop-filter:blur(4px);border:1px solid #E5E7EB;padding:2px 6px;border-radius:12px;display:flex;align-items:center;gap:4px;white-space:nowrap;margin-bottom:3px;box-shadow:0 2px 6px rgba(0,0,0,0.12);max-width:130px;">
          <span style="font-size:11px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;">${authorName}</span>
          ${connectionBadge}
        </div>

        <!-- Avatar Circle -->
        <div style="width:34px;height:34px;border-radius:50%;border:2.5px solid white;background:#F9FAFB;position:relative;box-shadow:0 3px 8px rgba(0,0,0,0.2);overflow:visible;">
          ${avatarContent}
          ${audioBadge}
        </div>

        <!-- Mini Pin Needle Pointer -->
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #0B6B3A;margin-top:-1px;"></div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'social-naijapin-marker',
      html,
      iconSize: [140, 68],
      iconAnchor: [70, 68],
    });

    iconCache.set(key, icon);
    return icon;
  }

  // Standard Memory Map Marker
  html = `
    <div style="
      background-color: ${categoryColor};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid white;
      ${selectionRing};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: 700;
        font-size: 11px;
      ">
        ${pin.has_audio ? '🔊' : '📍'}
      </div>
    </div>
  `;

  const icon = L.divIcon({
    className: 'standard-naijapin-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  iconCache.set(key, icon);
  return icon;
}
