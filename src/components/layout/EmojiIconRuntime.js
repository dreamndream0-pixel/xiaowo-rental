'use client'

import { useEffect } from 'react'

const ICON_MAP = {
  '🏠': 'home', '🏡': 'home', '🏢': 'building', '🏘': 'community', '🏘️': 'community',
  '👤': 'user', '👥': 'users', '📅': 'calendar', '📆': 'calendar',
  '📍': 'pin', '📞': 'phone', '💬': 'message', '✉': 'mail', '✉️': 'mail', '📧': 'mail',
  '🔍': 'search', '⚠': 'alert', '⚠️': 'alert', '✅': 'check', '❌': 'x', '✕': 'x',
  '⏳': 'loader', '💡': 'lightbulb', '🎉': 'sparkles', '🗺': 'map', '🗺️': 'map',
  '🏷': 'tag', '🏷️': 'tag', '📸': 'camera', '🖼': 'image', '🖼️': 'image',
  '✏': 'edit', '✏️': 'edit', '⭐': 'star', '☆': 'star', '❤️': 'heart', '🤍': 'heart',
  '🔑': 'key', '🔔': 'bell', '🔕': 'bell-off', '🔧': 'wrench', '🛠': 'wrench', '🛠️': 'wrench',
  '📊': 'chart', '📋': 'clipboard', '🌐': 'globe', '🔗': 'link', '🗑': 'trash', '🗑️': 'trash',
  '🔵': 'circle', '⏸': 'pause', '⏸️': 'pause', '▶': 'play', '▶️': 'play',
  '⚡': 'zap', '😔': 'sad', '👀': 'eye', '💴': 'money', '🔐': 'lock',
  '❄': 'snow', '❄️': 'snow', '🧊': 'box', '👕': 'shirt', '🔄': 'refresh',
  '🚿': 'shower', '🛏': 'bed', '🛏️': 'bed', '🪟': 'window', '📖': 'book', '🛋': 'sofa', '📶': 'wifi',
}

const EMOJIS = Object.keys(ICON_MAP).sort((a, b) => b.length - a.length)
const EMOJI_RE = new RegExp(`(${EMOJIS.map(escapeRegExp).join('|')})`, 'g')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function iconPath(name) {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    building: '<path d="M4 20h16"/><path d="M6 20V5h10v15"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>',
    community: '<path d="M4 20V9l8-5 8 5v11"/><path d="M8 20v-6h8v6"/><path d="M10 11h4"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    users: '<path d="M16 21a6 6 0 0 0-12 0"/><circle cx="10" cy="8" r="4"/><path d="M22 21a5 5 0 0 0-5-5"/><path d="M17 4a3 3 0 0 1 0 6"/>',
    calendar: '<path d="M7 3v4M17 3v4"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16"/>',
    pin: '<path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    loader: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-.8.7-1 1.4-1 2H9c0-.6-.2-1.3-1-2Z"/>',
    sparkles: '<path d="M12 3 10 9l-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
    map: '<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/>',
    tag: '<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4Z"/><circle cx="12" cy="13" r="4"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m21 16-5-5L5 19"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    star: '<path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.3 6-.9Z"/>',
    heart: '<path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l2 2M14 9l2 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    'bell-off': '<path d="m2 2 20 20"/><path d="M9 4a6 6 0 0 1 9 5c0 7 3 7 3 9H7"/><path d="M10 21h4"/><path d="M6.3 6.3C6.1 6.8 6 7.4 6 8c0 7-3 7-3 9h11"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a3 3 0 0 1-4-4l8.7-8.7Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M9 12h6M9 16h6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 5 12 7-12 7Z"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    sad: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8 17a5 5 0 0 1 8 0"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M7 9v6M17 9v6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    snow: '<path d="M12 2v20M4 6l16 12M20 6 4 18"/>',
    box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    shirt: '<path d="M8 4 4 7l3 4v9h10v-9l3-4-4-3-4 3Z"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.4 5.6L21 8"/><path d="M21 3v5h-5"/>',
    shower: '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M4 12h16M8 16h.01M12 16h.01M16 16h.01M10 20h.01M14 20h.01"/>',
    bed: '<path d="M3 7v13M21 12v8M3 14h18"/><path d="M7 12h5V9a2 2 0 0 0-2-2H7Z"/>',
    window: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
    sofa: '<path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M4 12h16v7H4z"/><path d="M4 19v2M20 19v2"/>',
    wifi: '<path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01"/>',
  }
  return paths[name] || paths.circle
}

function iconMarkup(emoji) {
  const name = ICON_MAP[emoji] || ICON_MAP[emoji.replace(/\uFE0F/g, '')]
  if (!name) return emoji
  return `<span class="emoji-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPath(name)}</svg></span>`
}

function createIconNode(emoji) {
  const span = document.createElement('span')
  span.innerHTML = iconMarkup(emoji)
  return span.firstChild || document.createTextNode(emoji)
}

function replaceTextNode(node) {
  const text = node.nodeValue
  EMOJI_RE.lastIndex = 0
  if (!text || !EMOJI_RE.test(text)) return
  EMOJI_RE.lastIndex = 0
  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  text.replace(EMOJI_RE, (match, _group, offset) => {
    if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)))
    fragment.appendChild(createIconNode(match))
    lastIndex = offset + match.length
    return match
  })
  if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  node.parentNode.replaceChild(fragment, node)
}

function shouldSkip(node) {
  if (!node || node.nodeType !== 1) return false
  return ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG'].includes(node.tagName) || node.closest?.('.emoji-icon')
}

function iconize(root = document.body) {
  if (!root || shouldSkip(root)) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkip(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    }
  })
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach(replaceTextNode)
}

export default function EmojiIconRuntime() {
  useEffect(() => {
    iconize()
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 3) replaceTextNode(node)
          else if (node.nodeType === 1) iconize(node)
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
