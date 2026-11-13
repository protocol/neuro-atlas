import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

globalThis.React = React;
test('Milestones side panel starts folded and remains manually expandable', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url:'https://atlas.example/milestones', pretendToBeVisual:true });
  globalThis.window=dom.window; globalThis.document=dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const { createRoot }=await import('react-dom/client');
  const root=createRoot(document.getElementById('root'));
  try {
    await act(async()=>root.render(React.createElement(MilestoneTimeline)));
    assert.ok(document.querySelector('aside') === null, 'side panel should be folded');
    const open=document.querySelector('button[aria-label="Open side panel"]');
    assert.ok(open,'collapsed panel retains an explicit opener');
    await act(async()=>open.click());
    assert.match(document.querySelector('aside').textContent,/Capital raised/);
    await act(async()=>document.querySelector('button[aria-label="Fold side panel to show the full year"]').click());
    assert.ok(document.querySelector('aside') === null, 'side panel should be folded');
    assert.ok(document.querySelector('button[aria-label="Open side panel"]'));
  } finally {
    await act(async()=>root.unmount()); dom.window.close();
  }
});
