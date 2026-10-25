import React from 'react';

const COLOR_MAP = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  'a': '#55ff55',
  'b': '#55ffff',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
};

/**
 * Parses Minecraft formatting codes (§0-§f, §k-§o, §r) and returns formatted React elements
 */
export function formatMinecraftText(text) {
  if (!text) return null;

  // Split by § code or & code if formatted that way
  const regex = /(?:§|&)([0-9a-fk-or])/gi;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  let currentColor = null;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;

  const elements = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      // It's a code
      const code = part.toLowerCase();
      if (COLOR_MAP[code]) {
        currentColor = COLOR_MAP[code];
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrike = false;
      } else if (code === 'l') {
        isBold = true;
      } else if (code === 'o') {
        isItalic = true;
      } else if (code === 'n') {
        isUnderline = true;
      } else if (code === 'm') {
        isStrike = true;
      } else if (code === 'r') {
        currentColor = null;
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrike = false;
      }
    } else {
      // It's text
      if (part) {
        elements.push(
          <span
            key={i}
            style={{
              color: currentColor || 'inherit',
              fontWeight: isBold ? 'bold' : 'inherit',
              fontStyle: isItalic ? 'italic' : 'inherit',
              textDecoration: [
                isUnderline ? 'underline' : '',
                isStrike ? 'line-through' : ''
              ].filter(Boolean).join(' ') || 'inherit',
            }}
          >
            {part}
          </span>
        );
      }
    }
  }

  return elements.length > 0 ? elements : text;
}
