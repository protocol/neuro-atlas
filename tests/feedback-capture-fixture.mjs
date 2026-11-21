import React from 'react';
import {Feedback as Controller} from '../src/components/feedback/feedback.tsx';
export {FEEDBACK_OPEN_EVENT} from '../src/components/feedback/feedback.tsx';
const capture=async()=>({status:'captured',mimeType:'image/png',width:1,height:1,data:'synthetic-png'});
export function Feedback(){return React.createElement(Controller,{capture});}
