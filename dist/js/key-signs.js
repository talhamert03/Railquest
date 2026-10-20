// Key symbols identify barriers, independently of every wagon's number or color.
import {L} from './i18n.js';
export const KEY_SIGNS=Object.freeze([
 Object.freeze({name:L('Güneş','Sun'),icon:'sun',color:'#956820'}),
 Object.freeze({name:L('Ay','Moon'),icon:'moon',color:'#387984'}),
 Object.freeze({name:L('Yıldız','Star'),icon:'star',color:'#87539c'})
]);
export const keySign=id=>KEY_SIGNS[id-1];
