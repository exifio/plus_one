import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as ApplyPageModule from './ApplyPage';

type ScreenshotUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
};

describe('ScreenshotUpload', () => {
  it('shows one image picker and supporting actions for a selected image', () => {
    const ScreenshotUpload = Reflect.get(ApplyPageModule, 'ScreenshotUpload') as
      | React.ComponentType<ScreenshotUploadProps>
      | undefined;
    expect(ScreenshotUpload).toBeDefined();
    if (!ScreenshotUpload) return;

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(ScreenshotUpload, { file: null, onChange: () => undefined }),
    );
    expect(emptyMarkup).toContain('type="file"');
    expect(emptyMarkup).toContain('accept="image/*"');
    expect(emptyMarkup).toContain('이미지 1장 선택');

    const imageFile = { name: '보관상품.png', type: 'image/png' } as File;
    const selectedMarkup = renderToStaticMarkup(
      React.createElement(ScreenshotUpload, { file: imageFile, onChange: () => undefined }),
    );
    expect(selectedMarkup).toContain('보관상품.png');
    expect(selectedMarkup).toContain('이미지 교체');
    expect(selectedMarkup).toContain('삭제');
  });

  it('accepts image files but rejects non-image files', () => {
    const isScreenshotFile = Reflect.get(ApplyPageModule, 'isScreenshotFile') as
      | ((file: File) => boolean)
      | undefined;
    expect(isScreenshotFile).toBeDefined();
    if (!isScreenshotFile) return;

    expect(isScreenshotFile({ type: 'image/jpeg' } as File)).toBe(true);
    expect(isScreenshotFile({ type: 'application/pdf' } as File)).toBe(false);
  });
});
