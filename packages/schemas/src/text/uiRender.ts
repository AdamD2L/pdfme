import type * as CSS from 'csstype';
import { UIRenderProps, Schema, getDefaultFont } from '@pdfme/common';
import type { TextSchema } from './types';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  DEFAULT_OPACITY,
} from './constants.js';
import {
  calculateDynamicFontSize,
  getFontKitFont,
  getBrowserVerticalFontAdjustments,
} from './helper.js';
import { addAlphaToHex } from '../renderUtils.js';

const mapVerticalAlignToFlex = (verticalAlignmentValue: string | undefined) => {
  switch (verticalAlignmentValue) {
    case VERTICAL_ALIGN_TOP:
      return 'flex-start';
    case VERTICAL_ALIGN_MIDDLE:
      return 'center';
    case VERTICAL_ALIGN_BOTTOM:
      return 'flex-end';
  }
  return 'flex-start';
};

const getBackgroundColor = (
  mode: 'form' | 'viewer' | 'designer',
  value: string,
  schema: Schema,
  defaultBackgroundColor: string
) => {
  if ((mode === 'form' || mode === 'designer') && value && schema.backgroundColor) {
    return schema.backgroundColor as string;
  } else if (mode === 'viewer') {
    return (schema.backgroundColor as string) ?? 'transparent';
  } else {
    return defaultBackgroundColor;
  }
};

export const uiRender = async (arg: UIRenderProps<TextSchema>) => {
  const {
    value,
    schema,
    rootElement,
    mode,
    onChange,
    stopEditing,
    tabIndex,
    placeholder,
    options,
    theme,
    _cache,
  } = arg;
  const font = options?.font || getDefaultFont();

  let dynamicFontSize: undefined | number = undefined;
  if (schema.dynamicFontSize && value) {
    dynamicFontSize = await calculateDynamicFontSize({
      textSchema: schema,
      font,
      value,
      startingFontSize: dynamicFontSize,
      _cache,
    });
  }

  const fontKitFont = await getFontKitFont(schema, font, _cache);
  // Depending on vertical alignment, we need to move the top or bottom of the font to keep
  // it within it's defined box and align it with the generated pdf.
  const { topAdj, bottomAdj } = getBrowserVerticalFontAdjustments(
    fontKitFont,
    dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
    schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT
  );

  const topAdjustment = topAdj.toString();
  const bottomAdjustment = bottomAdj.toString();

  const container = document.createElement('div');

  const containerStyle: CSS.Properties = {
    padding: 0,
    resize: 'none',
    backgroundColor: getBackgroundColor(
      mode,
      value,
      schema,
      addAlphaToHex(theme.colorPrimaryBg, 30)
    ),
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: mapVerticalAlignToFlex(schema.verticalAlignment),
    width: '100%',
    height: '100%',
    opacity: schema.opacity ?? DEFAULT_OPACITY,
  };
  Object.assign(container.style, containerStyle);
  rootElement.innerHTML = '';
  rootElement.appendChild(container);

  const textBlockStyle: CSS.Properties = {
    // Font formatting styles
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    // Block layout styles
    resize: 'none',
    border: 'none',
    outline: 'none',
    marginBottom: bottomAdjustment + 'px',
    paddingTop: topAdjustment + 'px',
    backgroundColor: 'transparent',
  };
  const textBlock = document.createElement('div');
  Object.assign(textBlock.style, textBlockStyle);

  if (mode === 'form' || mode === 'designer') {
    textBlock.contentEditable = 'plaintext-only';
    textBlock.tabIndex = tabIndex || 0;
    textBlock.innerText = value;
    textBlock.addEventListener('blur', (e: Event) => {
      onChange && onChange((e.target as HTMLDivElement).innerText);
      stopEditing && stopEditing();
    });

    textBlock.addEventListener('keypress', () => {
      setTimeout(() => {
        void (async () => {
        const value = textBlock.textContent;
        if (!schema.dynamicFontSize || !value) return;

        const newFontSize = await calculateDynamicFontSize({
          textSchema: schema,
          font,
          value,
          startingFontSize: dynamicFontSize,
          _cache,
        });
        textBlock.style.fontSize = `${newFontSize}pt`;
      })()
      }, 0);
    });

    if (placeholder) {
      textBlock.setAttribute('placeholder', placeholder);
      const placeholderStyle = document.createElement('style');
      placeholderStyle.textContent = `
        [contenteditable=true]:empty:before {
          content: attr(placeholder);
          pointer-events: none;
          display: block;
        }
      `;
      container.appendChild(placeholderStyle);
    }

    container.appendChild(textBlock);

    if (mode === 'designer') {
      textBlock.focus();

      // Set the focus to the end of the editable element when you focus, as we would for a textarea
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textBlock);
      range.collapse(false); // Collapse range to the end
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  } else {
    textBlock.innerHTML = value
      .split('')
      .map(
        (l: string, i: number) =>
          `<span style="letter-spacing:${
            String(value).length === i + 1 ? 0 : 'inherit'
          };">${l}</span>`
      )
      .join('');

    container.appendChild(textBlock);
  }
};
