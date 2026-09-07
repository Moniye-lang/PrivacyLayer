import React from 'react';

export interface ImageGeometry {
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  scaleX: number;
  scaleY: number;
}

export const ENTITY_TYPE_ABBREVIATIONS: Record<string, string> = {
  PASSWORD: 'PASS',
  API_KEY: 'KEY',
  CONNECTION_STRING: 'CONN',
  PROJECT_CODENAME: 'PROJ',
  PERSON_NAME: 'NAME',
  EMAIL_ADDRESS: 'EMAIL',
  PHONE_NUMBER: 'PHONE',
  CREDIT_CARD: 'CARD',
  BANK_ACCOUNT: 'BVN',
  IBAN: 'IBAN',
  SSN_NATIONAL_ID: 'NIN',
  PASSPORT_NUMBER: 'PASSPORT',
  SOURCE_CODE_SECRET: 'SECRET',
  COMPANY_SECRET: 'SECRET',
  ORGANIZATION: 'ORG',
  REPOSITORY: 'REPO',
  IP_ADDRESS: 'IP',
  URL: 'URL',
  JWT_TOKEN: 'JWT',
  CUSTOM_TERM: 'TERM',
  ADDRESS: 'ADDR',
  LOCATION: 'LOC',
  FINANCIAL_METRIC: 'FIN',
  EMPLOYEE_ID: 'EMP_ID',
  CUSTOMER_ID: 'CUST_ID',
  UUID: 'UUID',
  MEDICAL_RECORD: 'MED',
  LEGAL_REFERENCE: 'LEGAL',
  PRODUCT: 'PROD',
  EVENT: 'EVENT',
  DATE: 'DATE',
};

/**
 * Returns the abbreviated display label for a placeholder when space is constrained.
 * Example: "[[PASSWORD_001]]" -> "[[PASS_001]]" or "PASS_001"
 */
export function getAbbreviatedPlaceholder(placeholder: string, includeBrackets: boolean = true): string {
  if (!placeholder) return placeholder;
  // Match [[TYPE_001]] or TYPE_001
  const match = placeholder.match(/^\[\[([A-Z0-9_]+?)_(\d{3,4})\]\]$/) || placeholder.match(/^([A-Z0-9_]+?)_(\d{3,4})$/);
  if (!match) {
    if (includeBrackets && !placeholder.startsWith('[[')) {
      return `[[${placeholder.replace(/^\[*|\]*$/g, '')}]]`;
    }
    return placeholder;
  }

  const type = match[1];
  const num = match[2];
  const abbrev = ENTITY_TYPE_ABBREVIATIONS[type] || type;

  return `[[${abbrev}_${num}]]`;
}

/**
 * Single source of truth for image geometry and display coordinate scaling.
 */
export function getImageGeometry(img: HTMLImageElement | null): ImageGeometry {
  if (!img) {
    return {
      displayX: 0,
      displayY: 0,
      displayWidth: 800,
      displayHeight: 600,
      naturalWidth: 800,
      naturalHeight: 600,
      scaleX: 1,
      scaleY: 1,
    };
  }

  const rect = img.getBoundingClientRect();
  const containerW = Math.max(1, rect.width);
  const containerH = Math.max(1, rect.height);
  const naturalWidth = img.naturalWidth || img.width || containerW;
  const naturalHeight = img.naturalHeight || img.height || containerH;

  const aspect = naturalWidth / naturalHeight;
  let displayWidth = containerW;
  let displayHeight = containerH;

  if (containerW / containerH > aspect) {
    displayWidth = containerH * aspect;
  } else {
    displayHeight = containerW / aspect;
  }

  const offsetX = (containerW - displayWidth) / 2;
  const offsetY = (containerH - displayHeight) / 2;

  const scaleX = naturalWidth / Math.max(1, displayWidth);
  const scaleY = naturalHeight / Math.max(1, displayHeight);

  return {
    displayX: rect.left + offsetX,
    displayY: rect.top + offsetY,
    displayWidth,
    displayHeight,
    naturalWidth,
    naturalHeight,
    scaleX,
    scaleY,
  };
}

/**
 * Converts client pointer event coordinates directly into native image pixels.
 */
export function pointerToNativeCoords(
  pointerX: number,
  pointerY: number,
  img: HTMLImageElement
): { x: number; y: number } {
  const geom = getImageGeometry(img);
  const localX = pointerX - geom.displayX;
  const localY = pointerY - geom.displayY;

  const nativeX = Math.max(0, Math.min(geom.naturalWidth, Math.round(localX * geom.scaleX)));
  const nativeY = Math.max(0, Math.min(geom.naturalHeight, Math.round(localY * geom.scaleY)));

  return { x: nativeX, y: nativeY };
}

/**
 * Converts native image rectangle coordinates back into CSS display style object.
 */
export function nativeToDisplayStyle(
  nativeRect: { x: number; y: number; width: number; height: number },
  img: HTMLImageElement | null
): React.CSSProperties {
  if (!img) {
    return {
      left: `${nativeRect.x}px`,
      top: `${nativeRect.y}px`,
      width: `${nativeRect.width}px`,
      height: `${nativeRect.height}px`,
    };
  }

  const geom = getImageGeometry(img);
  const imgRect = img.getBoundingClientRect();
  const offsetX = geom.displayX - imgRect.left;
  const offsetY = geom.displayY - imgRect.top;

  const displayX = offsetX + nativeRect.x / geom.scaleX;
  const displayY = offsetY + nativeRect.y / geom.scaleY;
  const displayW = nativeRect.width / geom.scaleX;
  const displayH = nativeRect.height / geom.scaleY;

  return {
    left: `${Math.round(displayX)}px`,
    top: `${Math.round(displayY)}px`,
    width: `${Math.round(displayW)}px`,
    height: `${Math.round(displayH)}px`,
  };
}
