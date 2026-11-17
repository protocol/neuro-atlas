import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {MilestoneTimeline} from '../src/components/milestone-timeline.tsx';
globalThis.React=React;

test('lane headings retain context when the current-date detail view scrolls past January',()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const labels=[...dom.window.document.querySelectorAll('[data-milestone-lane-label]')];
    assert.deepEqual(labels.map(e=>e.textContent),['Capital','Clinical / regulatory','Commercial']);
    for(const label of labels){
      assert.match(label.className,/\bsticky\b/);
      assert.match(label.className,/\bleft-/);
      assert.doesNotMatch(label.parentElement.className,/overflow-hidden/,'lane must not intercept horizontal stickiness');
    }
  } finally {dom.window.close();}
});
