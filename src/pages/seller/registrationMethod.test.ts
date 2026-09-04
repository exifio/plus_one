import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as ApplyPageModule from './ApplyPage';

type RegistrationMethodSelectorProps = {
  value: '' | 'screenshot' | 'manual';
  onChange: (value: 'screenshot' | 'manual') => void;
};

describe('RegistrationMethodSelector', () => {
  it('shows both registration methods and marks the selected method', () => {
    const Selector = Reflect.get(ApplyPageModule, 'RegistrationMethodSelector') as
      | React.ComponentType<RegistrationMethodSelectorProps>
      | undefined;

    expect(Selector).toBeDefined();
    if (!Selector) return;

    const optionsMarkup = renderToStaticMarkup(
      React.createElement(Selector, { value: '', onChange: () => undefined }),
    );
    expect(optionsMarkup).toContain('등록 방식 선택');
    expect(optionsMarkup).toContain('스크린샷으로 등록');
    expect(optionsMarkup).toContain('직접 입력하기');
    expect(optionsMarkup).toContain('role="radiogroup"');

    const selectedMarkup = renderToStaticMarkup(
      React.createElement(Selector, { value: 'manual', onChange: () => undefined }),
    );
    expect(selectedMarkup).toContain('name="registrationMethod" checked="" value="manual"');
  });
});
